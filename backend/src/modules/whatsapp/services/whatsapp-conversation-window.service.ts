import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { WhatsappMessage } from '../entities/whatsapp-message.entity';

/**
 * 24h-style customer care session: last **inbound** WhatsApp message from the retailer
 * (see `whatsapp_messages` IN rows). Used to choose custom vs Meta template sends.
 */
@Injectable()
export class WhatsappConversationWindowService implements OnModuleDestroy {
  private readonly log = new Logger(WhatsappConversationWindowService.name);
  private readonly redis: Redis | null;
  private readonly cacheTtlSec: number;
  private readonly windowMs: number;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(WhatsappMessage)
    private readonly msgRepo: Repository<WhatsappMessage>,
  ) {
    const host = (this.config.get<string>('REDIS_HOST') ?? process.env.REDIS_HOST ?? '').trim();
    const port = Number(this.config.get<string>('REDIS_PORT') ?? process.env.REDIS_PORT ?? 6379);
    if (host) {
      try {
        this.redis = new Redis({
          host,
          port,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
      } catch {
        this.redis = null;
      }
    } else {
      this.redis = null;
    }
    this.cacheTtlSec = Number(
      this.config.get<number>('whatsapp.lastInboundCacheTtlSec') ?? 120,
    );
    this.windowMs =
      Number(this.config.get<number>('whatsapp.conversationWindowHours') ?? 24) *
      3600 *
      1000;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }

  cacheKey(tenantId: string, customerId: string): string {
    return `wa:last_inbound:${tenantId}:${customerId}`;
  }

  /**
   * `true` if the last inbound WhatsApp from this customer is within the configured window
   * (default 24h). No inbound history → `false` (use Meta template path).
   */
  async isWithin24h(tenantId: string, customerId: string | null): Promise<boolean> {
    const at = await this.getLastInboundAt(tenantId, customerId);
    if (!at) return false;
    return Date.now() - at.getTime() <= this.windowMs;
  }

  async getLastInboundAt(tenantId: string, customerId: string | null): Promise<Date | null> {
    if (!customerId) return null;
    const key = this.cacheKey(tenantId, customerId);
    if (this.redis) {
      try {
        const cached = await this.redis.get(key);
        if (cached === '__none__') return null;
        if (cached) return new Date(cached);
      } catch (e) {
        this.log.warn(
          `Redis last-inbound read failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    const row = await this.msgRepo.findOne({
      where: { tenantId, customerId, direction: 'IN' },
      order: { createdAt: 'DESC' },
      select: ['createdAt'],
    });
    const last = row?.createdAt ? new Date(row.createdAt) : null;
    void this.setCache(tenantId, customerId, last);
    return last;
  }

  private async setCache(tenantId: string, customerId: string, last: Date | null): Promise<void> {
    if (!this.redis) return;
    const key = this.cacheKey(tenantId, customerId);
    try {
      const val = last ? last.toISOString() : '__none__';
      await this.redis.set(key, val, 'EX', this.cacheTtlSec);
    } catch (e) {
      this.log.warn(
        `Redis last-inbound write failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** Call after persisting an inbound message so hybrid routing re-reads DB. */
  invalidate(tenantId: string, customerId: string | null): void {
    if (!customerId || !this.redis) return;
    void this.redis.del(this.cacheKey(tenantId, customerId)).catch(() => undefined);
  }
}
