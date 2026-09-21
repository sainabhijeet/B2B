import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappOrderSession } from '../entities/whatsapp-order-session.entity';
import type { WaSessionOwner } from '../whatsapp-session-owner.type';

const SESSION_IDLE_MAX_MS = 10 * 60 * 1000;

function sessionWhere(tenantId: string, owner: WaSessionOwner) {
  if ('customerId' in owner && owner.customerId) {
    return { tenantId, customerId: owner.customerId };
  }
  return { tenantId, tempCustomerId: owner.tempCustomerId! };
}

function newSessionPayload(tenantId: string, owner: WaSessionOwner, now: Date) {
  if ('customerId' in owner && owner.customerId) {
    return {
      tenantId,
      customerId: owner.customerId,
      tempCustomerId: null as string | null,
      state: 'IDLE',
      contextJson: {},
      lastActiveAt: now,
    };
  }
  return {
    tenantId,
    customerId: null as string | null,
    tempCustomerId: owner.tempCustomerId!,
    state: 'IDLE',
    contextJson: {},
    lastActiveAt: now,
  };
}

@Injectable()
export class WhatsappOrderSessionService {
  constructor(
    @InjectRepository(WhatsappOrderSession)
    private readonly repo: Repository<WhatsappOrderSession>,
  ) {}

  /** Returns existing row or creates IDLE session; bumps `last_active_at`. */
  async getSession(tenantId: string, owner: WaSessionOwner): Promise<WhatsappOrderSession> {
    let row = await this.repo.findOne({ where: sessionWhere(tenantId, owner) });
    const now = new Date();
    if (row) {
      const ageMs = now.getTime() - new Date(row.lastActiveAt).getTime();
      if (ageMs > SESSION_IDLE_MAX_MS) {
        await this.repo.delete({ id: row.id });
        row = null;
      }
    }
    if (!row) {
      row = this.repo.create(newSessionPayload(tenantId, owner, now));
    } else {
      row.lastActiveAt = now;
    }
    return this.repo.save(row);
  }

  async createSession(tenantId: string, owner: WaSessionOwner): Promise<WhatsappOrderSession> {
    const now = new Date();
    return this.repo.save(this.repo.create(newSessionPayload(tenantId, owner, now)));
  }

  async getById(sessionId: string): Promise<WhatsappOrderSession | null> {
    return this.repo.findOne({ where: { id: sessionId } });
  }

  async updateState(sessionId: string, state: string): Promise<WhatsappOrderSession> {
    const row = await this.require(sessionId);
    row.state = state;
    row.lastActiveAt = new Date();
    return this.repo.save(row);
  }

  /** Merges into existing `context_json`. */
  async updateContext(
    sessionId: string,
    context: Record<string, unknown>,
  ): Promise<WhatsappOrderSession> {
    const row = await this.require(sessionId);
    row.contextJson = { ...row.contextJson, ...context };
    row.lastActiveAt = new Date();
    return this.repo.save(row);
  }

  async resetSession(sessionId: string): Promise<void> {
    await this.repo.delete({ id: sessionId });
  }

  async resetSessionForOwner(tenantId: string, owner: WaSessionOwner): Promise<void> {
    await this.repo.delete(sessionWhere(tenantId, owner));
  }

  private async require(id: string): Promise<WhatsappOrderSession> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('WhatsApp order session not found.');
    return row;
  }
}
