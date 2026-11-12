import { ForbiddenException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { PATH_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';
import type { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

jest.mock('../../workers/queue-factory', () => ({
  createAppQueue: jest.fn(() => ({ add: jest.fn(), close: jest.fn() })),
}));

describe('NotificationsService read state', () => {
  const customerA: JwtUserPayload = {
    sub: 'customer-a-user',
    role: UserRole.CUSTOMER,
    tenantId: 'tenant-a',
    customerId: 'customer-a',
  };
  const customerB: JwtUserPayload = {
    sub: 'customer-b-user',
    role: UserRole.CUSTOMER,
    tenantId: 'tenant-a',
    customerId: 'customer-b',
  };
  const tenantBCustomer: JwtUserPayload = {
    sub: 'customer-a-user',
    role: UserRole.CUSTOMER,
    tenantId: 'tenant-b',
    customerId: 'customer-a-other-tenant',
  };

  let notificationsRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  let service: NotificationsService;

  beforeEach(() => {
    notificationsRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(async (row) => row),
      update: jest.fn(async () => ({ affected: 0 })),
      count: jest.fn(),
    };
    service = new NotificationsService(
      { findOne: jest.fn(), save: jest.fn(), create: jest.fn() } as never,
      { findOne: jest.fn(), save: jest.fn(), create: jest.fn() } as never,
      notificationsRepo as never,
      {} as never,
      { getPlanLimitByTenant: jest.fn() } as never,
      {} as never,
    );
  });

  it('allows an authenticated customer to mark own notification as read', async () => {
    const notification = {
      id: 'notification-1',
      tenantId: customerA.tenantId,
      userId: customerA.sub,
      readAt: null,
    };
    notificationsRepo.findOne.mockResolvedValue(notification);

    const result = await service.markRead(customerA, notification.id);

    expect(notificationsRepo.findOne).toHaveBeenCalledWith({
      where: {
        id: notification.id,
        tenantId: customerA.tenantId,
        userId: customerA.sub,
      },
    });
    expect(notificationsRepo.save).toHaveBeenCalledWith(notification);
    expect(notification.readAt).toBeInstanceOf(Date);
    expect(result.data).toBe(notification);
  });

  it('keeps marking an already-read notification idempotent', async () => {
    const readAt = new Date('2026-10-07T00:00:00.000Z');
    const notification = {
      id: 'notification-1',
      tenantId: customerA.tenantId,
      userId: customerA.sub,
      readAt,
    };
    notificationsRepo.findOne.mockResolvedValue(notification);

    await service.markRead(customerA, notification.id);

    expect(notificationsRepo.save).not.toHaveBeenCalled();
    expect(notification.readAt).toBe(readAt);
  });

  it('does not allow a customer to mark another customer notification as read', async () => {
    notificationsRepo.findOne.mockResolvedValue(null);

    await expect(
      service.markRead(customerA, 'customer-b-notification'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(notificationsRepo.findOne).toHaveBeenCalledWith({
      where: {
        id: 'customer-b-notification',
        tenantId: customerA.tenantId,
        userId: customerA.sub,
      },
    });
    expect(notificationsRepo.save).not.toHaveBeenCalled();
  });

  it('does not allow a customer to mark another tenant notification as read', async () => {
    notificationsRepo.findOne.mockResolvedValue(null);

    await expect(
      service.markRead(customerA, 'tenant-b-notification'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(notificationsRepo.findOne).toHaveBeenCalledWith({
      where: {
        id: 'tenant-b-notification',
        tenantId: customerA.tenantId,
        userId: customerA.sub,
      },
    });
  });

  it('mark-all-read only affects the current customer notifications', async () => {
    notificationsRepo.update.mockResolvedValue({ affected: 2 });

    const result = await service.markAllRead(customerA);

    expect(notificationsRepo.update).toHaveBeenCalledWith(
      {
        tenantId: customerA.tenantId,
        userId: customerA.sub,
        readAt: IsNull(),
      },
      { readAt: expect.any(Date) },
    );
    expect(result.data.updated).toBe(2);
  });

  it('mark-all-read does not target another customer notifications', async () => {
    await service.markAllRead(customerA);

    expect(notificationsRepo.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: customerB.sub }),
      expect.anything(),
    );
  });

  it('returns the unread count for the current customer', async () => {
    notificationsRepo.count.mockResolvedValue(3);

    const result = await service.unreadCount(customerA);

    expect(notificationsRepo.count).toHaveBeenCalledWith({
      where: {
        tenantId: customerA.tenantId,
        userId: customerA.sub,
        readAt: IsNull(),
      },
    });
    expect(result.data.count).toBe(3);
  });

  it('unread count is customer-scoped', async () => {
    await service.unreadCount(customerA);

    expect(notificationsRepo.count).not.toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: customerB.sub }),
    });
  });

  it('unread count is tenant-scoped', async () => {
    await service.unreadCount(tenantBCustomer);

    expect(notificationsRepo.count).toHaveBeenCalledWith({
      where: {
        tenantId: tenantBCustomer.tenantId,
        userId: tenantBCustomer.sub,
        readAt: IsNull(),
      },
    });
  });

  it('requires tenant context for read-state operations', async () => {
    const withoutTenant: JwtUserPayload = {
      sub: 'customer-without-tenant',
      role: UserRole.CUSTOMER,
      tenantId: null,
      customerId: 'customer-without-tenant',
    };

    await expect(service.unreadCount(withoutTenant)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.markRead(withoutTenant, 'notification-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.markAllRead(withoutTenant)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('preserves existing notification listing scope', async () => {
    notificationsRepo.find.mockResolvedValue([]);

    await service.listNotifications(customerA);

    expect(notificationsRepo.find).toHaveBeenCalledWith({
      where: { tenantId: customerA.tenantId, userId: customerA.sub },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  });
});

describe('NotificationsController read-state route registration', () => {
  it('keeps notification routes guarded by JWT and roles guards', () => {
    const guards = Reflect.getMetadata('__guards__', NotificationsController);

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('registers unread-count, mark-all-read, and mark-one-read routes', () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        NotificationsController.prototype.unreadCount,
      ),
    ).toBe('notifications/unread-count');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        NotificationsController.prototype.markAllRead,
      ),
    ).toBe('notifications/read-all');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        NotificationsController.prototype.markRead,
      ),
    ).toBe('notifications/:id/read');
  });
});
