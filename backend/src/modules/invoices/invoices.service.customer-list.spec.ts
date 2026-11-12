import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Invoice } from '../../common/entities/invoice.entity';
import { Order } from '../../common/entities/order.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import type { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

jest.mock('../../workers/queue-factory', () => ({
  areQueuesEnabled: jest.fn(() => false),
  createAppQueue: jest.fn(() => ({ add: jest.fn(), close: jest.fn() })),
}));

function customer(overrides: Partial<JwtUserPayload> = {}): JwtUserPayload {
  return {
    sub: 'customer-a-user',
    role: UserRole.CUSTOMER,
    tenantId: 'tenant-a',
    customerId: 'customer-a',
    ...overrides,
  };
}

function staff(overrides: Partial<JwtUserPayload> = {}): JwtUserPayload {
  return {
    sub: 'staff-user',
    role: UserRole.STAFF,
    tenantId: 'tenant-a',
    customerId: null,
    ...overrides,
  };
}

function queryBuilder(rows: unknown[]) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
}

function makeService(input?: {
  invoice?: Partial<Invoice> | null;
  order?: Partial<Order> | null;
  invoiceRows?: unknown[];
}) {
  const invoiceRows = input?.invoiceRows ?? [
    {
      id: 'invoice-a',
      tenantId: 'tenant-a',
      orderId: 'order-a',
      invoiceNumber: 'INV-1',
      totalAmount: '100.00',
      status: 'GENERATED',
      storageObjectId: 'storage-object-a',
      createdAt: new Date('2026-10-08T00:00:00.000Z'),
    },
  ];
  const qb = queryBuilder(invoiceRows);
  const invoiceRepo = {
    createQueryBuilder: jest.fn(() => qb),
    find: jest.fn().mockResolvedValue(invoiceRows),
    findOne: jest.fn().mockResolvedValue(
      input?.invoice === null
        ? null
        : {
            id: 'invoice-a',
            tenantId: 'tenant-a',
            orderId: 'order-a',
            invoiceNumber: 'INV-1',
            totalAmount: '100.00',
            status: 'GENERATED',
            storageObjectId: 'storage-object-a',
            createdAt: new Date('2026-10-08T00:00:00.000Z'),
            ...input?.invoice,
          },
    ),
  };
  const orderRepo = {
    findOne: jest.fn().mockResolvedValue(
      input?.order === null
        ? null
        : {
            id: 'order-a',
            tenantId: 'tenant-a',
            userId: 'customer-a-user',
            deletedAt: null,
            ...input?.order,
          },
    ),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Invoice) return invoiceRepo;
      if (entity === Order) return orderRepo;
      return invoiceRepo;
    }),
  };
  const tenantRunner = {
    withTenantCatalog: jest.fn(async (_tenantId, cb) => cb(manager)),
  };
  const dataSource = {
    getRepository: jest.fn(() => ({ find: jest.fn().mockResolvedValue([]) })),
  };
  const storageObjects = {
    lookupObject: jest.fn().mockResolvedValue({
      id: 'storage-object-a',
      tenantId: 'tenant-a',
      ownershipType: 'TENANT',
      objectCategory: 'invoice_document',
      metadata: { invoiceId: 'invoice-a' },
    }),
  };
  const storageDelivery = {
    createSignedReadAccess: jest.fn().mockResolvedValue({
      objectId: 'storage-object-a',
      url: '/api/v1/storage-objects/storage-object-a/content?token=signed',
      expiresInSeconds: 300,
      expiresAt: new Date('2026-10-08T00:05:00.000Z'),
    }),
  };
  const service = new InvoicesService(
    dataSource as never,
    tenantRunner as never,
    { findOne: jest.fn(), save: jest.fn(), create: jest.fn() } as never,
    { findOne: jest.fn() } as never,
    { allocate: jest.fn(), releaseAllocation: jest.fn() } as never,
    { sign: jest.fn((value) => value), storeBuffer: jest.fn() } as never,
    { createForUser: jest.fn() } as never,
    { resolveProvider: jest.fn() } as never,
    storageObjects as never,
    storageDelivery as never,
    {} as never,
  );
  return {
    service,
    qb,
    invoiceRepo,
    orderRepo,
    manager,
    tenantRunner,
    storageObjects,
    storageDelivery,
  };
}

describe('InvoicesService customer invoice list', () => {
  it('allows an authenticated customer to list only own invoices', async () => {
    const { service, tenantRunner, invoiceRepo, qb } = makeService();
    const user = customer();

    const result = await service.list(user);

    expect(tenantRunner.withTenantCatalog).toHaveBeenCalledWith(
      user.tenantId,
      expect.any(Function),
    );
    expect(invoiceRepo.createQueryBuilder).toHaveBeenCalledWith('invoice');
    expect(qb.innerJoin).toHaveBeenCalledWith(
      expect.any(Function),
      'order',
      'order.id = invoice.order_id',
    );
    expect(qb.where).toHaveBeenCalledWith('invoice.tenant_id = :tenantId', {
      tenantId: user.tenantId,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('order.tenant_id = :tenantId', {
      tenantId: user.tenantId,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('order.user_id = :userId', {
      userId: user.sub,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('order.deleted_at IS NULL');
    expect(result.data).toHaveLength(1);
  });

  it('does not trust arbitrary customerId request parameters for list authorization', async () => {
    const { service, qb } = makeService();
    const user = customer();

    await service.list({ ...user, customerId: 'customer-b' });

    expect(qb.andWhere).toHaveBeenCalledWith('order.user_id = :userId', {
      userId: user.sub,
    });
    expect(qb.andWhere).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ customerId: 'customer-b' }),
    );
  });

  it('enforces tenant scoping for customer invoice list', async () => {
    const { service, tenantRunner, qb } = makeService();
    const user = customer({ tenantId: 'tenant-b' });

    await service.list(user);

    expect(tenantRunner.withTenantCatalog).toHaveBeenCalledWith(
      'tenant-b',
      expect.any(Function),
    );
    expect(qb.where).toHaveBeenCalledWith('invoice.tenant_id = :tenantId', {
      tenantId: 'tenant-b',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('order.tenant_id = :tenantId', {
      tenantId: 'tenant-b',
    });
  });

  it('rejects customer invoice list without tenant context', async () => {
    const { service } = makeService();

    await expect(
      service.list(customer({ tenantId: null })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps staff invoice list tenant-wide and unaffected', async () => {
    const { service, invoiceRepo } = makeService();
    const user = staff();

    await service.list(user);

    expect(invoiceRepo.find).toHaveBeenCalledWith({
      where: { tenantId: user.tenantId },
      order: { createdAt: 'DESC' },
    });
    expect(invoiceRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('does not expose PDF, document URL, or storage object fields in list results', async () => {
    const { service } = makeService();

    const result = await service.list(customer());

    expect(result.data[0]).not.toHaveProperty('pdfUrl');
    expect(result.data[0]).not.toHaveProperty('url');
    expect(result.data[0]).not.toHaveProperty('documentReference');
    expect(result.data[0]).not.toHaveProperty('storageObjectId');
  });
});

describe('InvoicesService customer invoice download', () => {
  it('allows a customer to receive a signed URL for their own invoice document', async () => {
    const { service, storageObjects, storageDelivery } = makeService();

    const result = await service.download(customer(), 'invoice-a');

    expect(storageObjects.lookupObject).toHaveBeenCalledWith(
      'storage-object-a',
      expect.objectContaining({ sub: 'customer-a-user', tenantId: 'tenant-a' }),
      'read',
    );
    expect(storageDelivery.createSignedReadAccess).toHaveBeenCalledWith(
      'storage-object-a',
      expect.objectContaining({ sub: 'customer-a-user', tenantId: 'tenant-a' }),
    );
    expect(result.data.url).toContain('/api/v1/storage-objects/');
    expect(result.data).not.toHaveProperty('storageObjectId');
  });

  it('rejects a customer attempting to download another customer invoice', async () => {
    const { service } = makeService({ order: { userId: 'customer-b-user' } });

    await expect(
      service.download(customer(), 'invoice-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a customer attempting to download another tenant invoice', async () => {
    const { service } = makeService();

    await expect(
      service.download(customer({ tenantId: 'tenant-b' }), 'invoice-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not trust arbitrary customerId values for download authorization', async () => {
    const { service, orderRepo } = makeService();
    const user = customer({ customerId: 'customer-b' });

    await service.download(user, 'invoice-a');

    expect(orderRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'order-a', deletedAt: expect.anything() },
    });
  });

  it('does not trust arbitrary tenantId values for download authorization', async () => {
    const { service } = makeService();

    await expect(
      service.download(customer({ tenantId: null }), 'invoice-a'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a controlled failure when an old invoice has no storage object', async () => {
    const { service } = makeService({ invoice: { storageObjectId: null } });

    await expect(
      service.download(customer(), 'invoice-a'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects storage objects that are not the invoice document for this invoice', async () => {
    const { service, storageObjects } = makeService();
    storageObjects.lookupObject.mockResolvedValueOnce({
      id: 'storage-object-a',
      tenantId: 'tenant-a',
      ownershipType: 'TENANT',
      objectCategory: 'invoice_document',
      metadata: { invoiceId: 'invoice-b' },
    });

    await expect(
      service.download(customer(), 'invoice-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('InvoicesController customer route metadata', () => {
  const service = { generate: jest.fn(), list: jest.fn(), download: jest.fn() };
  const controller = new InvoicesController(service as never);

  it('keeps invoice routes protected by JWT, roles, and tenant guards', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, InvoicesController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      TenantAccessGuard,
    ]);
  });

  it('allows CUSTOMER on list and secure download only, not generate', () => {
    expect(Reflect.getMetadata(ROLES_KEY, controller.list)).toContain(
      UserRole.CUSTOMER,
    );
    expect(Reflect.getMetadata(ROLES_KEY, controller.generate)).not.toContain(
      UserRole.CUSTOMER,
    );
    expect(Reflect.getMetadata(ROLES_KEY, controller.download)).toContain(
      UserRole.CUSTOMER,
    );
  });

  it('preserves the existing invoice list path', () => {
    expect(Reflect.getMetadata(PATH_METADATA, InvoicesController)).toBe(
      'invoices',
    );
    expect(Reflect.getMetadata(PATH_METADATA, controller.list)).toBe('/');
  });
});
