import { OrdersService } from './orders.service';
import { UserRole } from '../../common/enums/user-role.enum';

jest.mock('../../workers/queue-factory', () => ({
  areQueuesEnabled: jest.fn(() => false),
  createAppQueue: jest.fn(() => ({
    add: jest.fn(),
    close: jest.fn(),
    getJobCounts: jest.fn(),
  })),
}));

type HarnessOptions = {
  enqueueFails?: boolean;
};

function makeHarness(options: HarnessOptions = {}) {
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const customerId = '33333333-3333-4333-8333-333333333333';
  const order = {
    id: '44444444-4444-4444-8444-444444444444',
    tenantId,
    userId,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    deletedAt: null,
  };
  let payment: any = null;
  let registeredObject: any = null;

  const ordersRepo = {
    findOne: jest.fn(async () => order),
    save: jest.fn(),
  };
  const orderPaymentsRepo = {
    findOne: jest.fn(async () => payment),
    create: jest.fn((value: any) => ({
      id: '55555555-5555-4555-8555-555555555555',
      ...value,
    })),
    save: jest.fn(async (value: any) => {
      payment = { ...value };
      return payment;
    }),
  };
  const manager = {
    getRepository: jest.fn((entity: { name?: string }) => {
      if (entity.name === 'Order') return ordersRepo;
      if (entity.name === 'OrderPayment') return orderPaymentsRepo;
      throw new Error(`Unexpected repository ${entity.name ?? 'unknown'}`);
    }),
  };
  const tenantRunner = {
    withTenantCatalog: jest.fn(async (_tenantId: string, callback: any) =>
      callback(manager),
    ),
  };
  const usersRepo = {
    findOne: jest.fn(async () => ({ id: userId, customerId })),
  };
  const uploadValidation = {
    validateFileOrThrow: jest.fn(({ objectKey }: { objectKey?: string }) => ({
      extension: '.png',
      filename: 'payment-proof.png',
      detectedMimeType: 'image/png',
      sizeBytes: 68,
      objectKey,
    })),
  };
  const quarantine = {
    write: jest.fn(async () => ({ sizeBytes: 68 })),
    delete: jest.fn(async () => undefined),
  };
  const storageRuntime = {
    resolveProvider: jest.fn(async () => ({
      metadata: { providerId: null, source: 'local' },
    })),
  };
  const storageObjects = {
    registerQuarantinedTenantObjectForTenant: jest.fn(
      async (_tenantId: string, objectId: string, input: any) => {
        registeredObject = {
          id: objectId,
          status: 'QUARANTINED',
          scanStatus: 'QUARANTINED',
          ...input,
        };
        return registeredObject;
      },
    ),
  };
  const mediaScanQueue = {
    enqueue: jest.fn(async () => {
      if (options.enqueueFails) throw new Error('redis unavailable');
    }),
  };
  const configService = {
    get: jest.fn((_key: string, fallback: unknown) => fallback),
  };

  const service = new OrdersService(
    {} as any,
    tenantRunner as any,
    {} as any,
    usersRepo as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    configService as any,
    storageRuntime as any,
    storageObjects as any,
    {} as any,
    uploadValidation as any,
    quarantine as any,
    mediaScanQueue as any,
  );

  const actor = {
    sub: userId,
    tenantId,
    role: UserRole.CUSTOMER,
    customerId,
  };
  const file = {
    fieldname: 'proof',
    originalname: 'payment-proof.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 68,
    buffer: Buffer.from('safe payment proof'),
  } as Express.Multer.File;

  return {
    service,
    actor,
    file,
    order,
    ordersRepo,
    orderPaymentsRepo,
    mediaScanQueue,
    quarantine,
    storageObjects,
    getPayment: () => payment,
    getRegisteredObject: () => registeredObject,
  };
}

describe('OrdersService payment proof media-scan invariants', () => {
  it('keeps order and payment status unchanged while proof waits for scanning', async () => {
    const h = makeHarness();

    const response = await h.service.uploadPaymentProofFile(
      h.actor,
      h.order.id,
      { paymentReference: 'UTR-123', paymentNote: 'uploaded proof' },
      h.file,
    );

    expect(response.data.status).toBe('UPLOADED');
    expect(response.data.storageStatus).toBe('QUARANTINED');
    expect(response.data.scanStatus).toBe('QUARANTINED');
    expect(h.order.status).toBe('PENDING');
    expect(h.order.paymentStatus).toBe('PENDING');
    expect(h.ordersRepo.save).not.toHaveBeenCalled();
    expect(h.mediaScanQueue.enqueue).toHaveBeenCalledWith(
      response.data.storageObjectId,
    );
  });

  it('fails closed when enqueue fails and leaves the associated proof quarantined for remediation', async () => {
    const h = makeHarness({ enqueueFails: true });

    await expect(
      h.service.uploadPaymentProofFile(
        h.actor,
        h.order.id,
        { paymentReference: 'UTR-QUEUE-FAIL' },
        h.file,
      ),
    ).rejects.toThrow('redis unavailable');

    const savedPayment = h.getPayment();
    const registeredObject = h.getRegisteredObject();
    expect(savedPayment).toMatchObject({
      orderId: h.order.id,
      status: 'UPLOADED',
      paymentProofStorageObjectId: registeredObject.id,
    });
    expect(registeredObject).toMatchObject({
      status: 'QUARANTINED',
      scanStatus: 'QUARANTINED',
      objectCategory: 'payment_proof',
      accessScope: 'TENANT_PRIVATE',
    });
    expect(h.order.status).toBe('PENDING');
    expect(h.order.paymentStatus).toBe('PENDING');
    expect(h.ordersRepo.save).not.toHaveBeenCalled();
    expect(h.quarantine.delete).not.toHaveBeenCalled();
  });
});
