import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, Repository } from 'typeorm';
import { Notification } from '../../common/entities/notification.entity';
import { TenantPushConfig } from '../../common/entities/tenant-push-config.entity';
import { UserDeviceToken } from '../../common/entities/user-device-token.entity';
import { User } from '../../common/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { PLATFORM_ROLES } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { QUEUE_NAMES } from '../../workers/queues';
import { AppQueue, createAppQueue } from '../../workers/queue-factory';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { RemoveDeviceTokenDto } from './dto/remove-device-token.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { SetTenantPushConfigDto } from './dto/set-tenant-push-config.dto';

@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly notificationQueue: AppQueue;

  constructor(
    @InjectRepository(UserDeviceToken)
    private readonly deviceTokensRepo: Repository<UserDeviceToken>,
    @InjectRepository(TenantPushConfig)
    private readonly tenantPushConfigRepo: Repository<TenantPushConfig>,
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly subscriptionsService: SubscriptionsService,
    configService: ConfigService,
  ) {
    this.notificationQueue = createAppQueue(
      QUEUE_NAMES.notification,
      configService,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.notificationQueue.close();
  }

  async registerDeviceToken(user: JwtUserPayload, dto: RegisterDeviceTokenDto) {
    if (!user.tenantId)
      throw new ForbiddenException('Tenant context required.');
    let row = await this.deviceTokensRepo.findOne({
      where: { userId: user.sub, token: dto.token },
    });
    if (!row) {
      row = this.deviceTokensRepo.create({
        userId: user.sub,
        tenantId: user.tenantId,
        token: dto.token,
        deviceType: dto.deviceType,
        appVersion: dto.appVersion ?? null,
        status: 'active',
      });
    } else {
      row.tenantId = user.tenantId;
      row.deviceType = dto.deviceType;
      row.appVersion = dto.appVersion ?? null;
      row.status = 'active';
    }
    const saved = await this.deviceTokensRepo.save(row);
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async removeDeviceToken(user: JwtUserPayload, dto: RemoveDeviceTokenDto) {
    const row = await this.deviceTokensRepo.findOne({
      where: { userId: user.sub, token: dto.token },
    });
    if (!row)
      return { success: true, data: { removed: false }, meta: {}, message: '' };
    row.status = 'inactive';
    await this.deviceTokensRepo.save(row);
    return { success: true, data: { removed: true }, meta: {}, message: '' };
  }

  async setTenantPushConfig(
    user: JwtUserPayload,
    dto: SetTenantPushConfigDto,
    tenantId?: string,
  ) {
    const resolvedTenantId = this.resolveTenant(user, tenantId);
    let row = await this.tenantPushConfigRepo.findOne({
      where: { tenantId: resolvedTenantId },
    });
    if (!row) {
      row = this.tenantPushConfigRepo.create({
        tenantId: resolvedTenantId,
        provider: dto.provider,
        enabled: dto.enabled ?? true,
      });
    } else {
      row.provider = dto.provider;
      row.enabled = dto.enabled ?? row.enabled;
    }
    const saved = await this.tenantPushConfigRepo.save(row);
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async getTenantPushConfig(user: JwtUserPayload, tenantId?: string) {
    const resolvedTenantId = this.resolveTenant(user, tenantId);
    const row = await this.tenantPushConfigRepo.findOne({
      where: { tenantId: resolvedTenantId },
    });
    return {
      success: true,
      data: row ?? {
        tenantId: resolvedTenantId,
        provider: 'firebase',
        enabled: true,
      },
      meta: {},
      message: '',
    };
  }

  async sendNotification(user: JwtUserPayload, dto: SendNotificationDto) {
    if (!user.tenantId)
      throw new ForbiddenException('Tenant context required.');
    await this.enforceDailyLimit(user.tenantId);
    const pushConfig = await this.tenantPushConfigRepo.findOne({
      where: { tenantId: user.tenantId },
    });
    if (pushConfig && !pushConfig.enabled) {
      throw new BadRequestException(
        'Push notifications are disabled for this tenant.',
      );
    }

    const eventType = dto.eventType ?? 'CUSTOM_NOTIFICATION';
    if (dto.targetType === 'single_user') {
      if (!dto.userId)
        throw new BadRequestException('userId is required for single_user');
      await this.notificationQueue.add(eventType, {
        tenantId: user.tenantId,
        targetType: 'single_user',
        userId: dto.userId,
        title: dto.title,
        message: dto.message,
      });
      return {
        success: true,
        data: { queued: true, target: 'single_user' },
        meta: {},
        message: '',
      };
    }

    if (dto.targetType === 'multiple_users') {
      if (!dto.userIds || dto.userIds.length === 0)
        throw new BadRequestException(
          'userIds are required for multiple_users',
        );
      await this.notificationQueue.add(eventType, {
        tenantId: user.tenantId,
        targetType: 'multiple_users',
        userIds: dto.userIds,
        title: dto.title,
        message: dto.message,
      });
      return {
        success: true,
        data: { queued: true, target: 'multiple_users' },
        meta: {},
        message: '',
      };
    }

    if (!dto.topic)
      throw new BadRequestException('topic is required for topic target');
    await this.notificationQueue.add(eventType, {
      tenantId: user.tenantId,
      targetType: 'topic',
      topic: dto.topic,
      title: dto.title,
      message: dto.message,
    });
    return {
      success: true,
      data: { queued: true, target: 'topic' },
      meta: {},
      message: '',
    };
  }

  async listNotifications(user: JwtUserPayload) {
    if (!user.tenantId)
      return { success: true, data: [], meta: {}, message: '' };
    const data = await this.notificationsRepo.find({
      where: { tenantId: user.tenantId, userId: user.sub },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return { success: true, data, meta: {}, message: '' };
  }

  async unreadCount(user: JwtUserPayload) {
    const count = await this.notificationsRepo.count({
      where: {
        userId: user.sub,
        tenantId: user.tenantId ?? undefined,
        readAt: IsNull(),
      },
    });
    return { success: true, data: { count }, meta: {}, message: '' };
  }

  async markRead(user: JwtUserPayload, id: string) {
    const row = await this.notificationsRepo.findOne({
      where: { id, userId: user.sub, tenantId: user.tenantId ?? undefined },
    });
    if (!row) throw new ForbiddenException('Notification not found.');
    row.readAt ??= new Date();
    await this.notificationsRepo.save(row);
    return { success: true, data: row, meta: {}, message: '' };
  }

  async markAllRead(user: JwtUserPayload) {
    const result = await this.notificationsRepo.update(
      {
        userId: user.sub,
        tenantId: user.tenantId ?? undefined,
        readAt: IsNull(),
      },
      { readAt: new Date() },
    );
    return {
      success: true,
      data: { updated: result.affected ?? 0 },
      meta: {},
      message: '',
    };
  }

  async createForUser(input: {
    tenantId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      return await this.notificationsRepo.save(
        this.notificationsRepo.create({
          tenantId: input.tenantId,
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          status: 'SENT',
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          actionUrl: input.actionUrl ?? null,
          metadataJson: input.metadata ?? {},
          readAt: null,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Could not create ${input.type} notification for user ${input.userId}.`,
        error,
      );
      return null;
    }
  }

  async createForTenantStaff(
    input: Omit<Parameters<NotificationsService['createForUser']>[0], 'userId'>,
  ) {
    try {
      const recipients = await this.usersRepo.find({
        where: {
          tenantId: input.tenantId,
          role: In([UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF]),
        },
      });
      if (!recipients.length) return [];
      return Promise.all(
        recipients.map((recipient) =>
          this.createForUser({ ...input, userId: recipient.id }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Could not resolve notification recipients for tenant ${input.tenantId}.`,
        error,
      );
      return [];
    }
  }

  private resolveTenant(user: JwtUserPayload, tenantId?: string): string {
    if (PLATFORM_ROLES.includes(user.role)) {
      if (!tenantId)
        throw new BadRequestException(
          'tenantId is required for platform user.',
        );
      return tenantId;
    }
    if (!user.tenantId)
      throw new ForbiddenException('Tenant context required.');
    if (tenantId && tenantId !== user.tenantId)
      throw new ForbiddenException('Cross-tenant access denied.');
    return user.tenantId;
  }

  private async enforceDailyLimit(tenantId: string): Promise<void> {
    const limits =
      await this.subscriptionsService.getPlanLimitByTenant(tenantId);
    if (limits.notificationsPerDay <= 0)
      throw new ForbiddenException('Notification limit exceeded.');

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const todayCount = await this.notificationsRepo.count({
      where: {
        tenantId,
        createdAt: Between(start, end),
        type: In([
          'CUSTOM_NOTIFICATION',
          'ORDER_CREATED',
          'PAYMENT_UPLOADED',
          'ORDER_PROCESSING',
          'ORDER_DISPATCHED',
          'ORDER_DELIVERED',
        ]),
      },
    });
    if (todayCount >= limits.notificationsPerDay) {
      throw new ForbiddenException(
        `Daily notification limit reached (${limits.notificationsPerDay}).`,
      );
    }
  }
}
