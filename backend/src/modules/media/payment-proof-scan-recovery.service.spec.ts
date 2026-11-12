import { PaymentProofScanRecoveryService } from './payment-proof-scan-recovery.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
const storageObjectId = '22222222-2222-4222-8222-222222222222';
const paymentId = '33333333-3333-4333-8333-333333333333';
const orderId = '44444444-4444-4444-8444-444444444444';

type HarnessOptions = {
  candidates?: Array<{
    storageObjectId: string;
    orderPaymentId: string;
    orderId: string;
  }>;
  stillEligible?: boolean[];
  enqueueFails?: boolean;
};

function makeHarness(options: HarnessOptions = {}) {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('LIMIT 1')) {
      const eligible = options.stillEligible?.shift() ?? true;
      return eligible ? [{ id: storageObjectId }] : [];
    }
    return (
      options.candidates ?? [
        {
          storageObjectId,
          orderPaymentId: paymentId,
          orderId,
        },
      ]
    );
  });
  const manager = { query };
  const dataSource = {
    getRepository: jest.fn(() => ({
      find: jest.fn(async () => [
        {
          id: tenantId,
          slug: 'tenant-one',
          tenantSchemaProvisioned: true,
        },
      ]),
    })),
  };
  const tenantRunner = {
    withTenantCatalog: jest.fn(async (_tenantId: string, callback: any) =>
      callback(manager),
    ),
  };
  const mediaScanQueue = {
    enqueue: jest.fn(async () => {
      if (options.enqueueFails) throw new Error('redis unavailable');
    }),
  };
  const service = new PaymentProofScanRecoveryService(
    dataSource as any,
    tenantRunner as any,
    mediaScanQueue as any,
  );
  return { service, dataSource, tenantRunner, manager, mediaScanQueue };
}

describe('PaymentProofScanRecoveryService', () => {
  it('uses dry-run by default and does not enqueue jobs', async () => {
    const h = makeHarness();

    const result = await h.service.recover();

    expect(result.mode).toBe('dry-run');
    expect(result.candidateCount).toBe(1);
    expect(result.enqueuedCount).toBe(0);
    expect(h.mediaScanQueue.enqueue).not.toHaveBeenCalled();
  });

  it('apply enqueues only currently eligible payment-proof objects', async () => {
    const h = makeHarness();

    const result = await h.service.recover({ apply: true });

    expect(result.mode).toBe('apply');
    expect(result.enqueuedCount).toBe(1);
    expect(h.mediaScanQueue.enqueue).toHaveBeenCalledWith(storageObjectId);
  });

  it('scopes candidate selection to tenant-private quarantined payment proofs linked to order payments', async () => {
    const h = makeHarness({ candidates: [] });

    await h.service.recover();

    const candidateSql = h.manager.query.mock.calls[0][0] as string;
    expect(candidateSql).toContain('payment.payment_proof_storage_object_id');
    expect(candidateSql).toContain("object.object_category = 'payment_proof'");
    expect(candidateSql).toContain("object.access_scope = 'TENANT_PRIVATE'");
    expect(candidateSql).toContain("object.status = 'QUARANTINED'");
    expect(candidateSql).toContain("object.scan_status = 'QUARANTINED'");
    expect(candidateSql).toContain('object.deleted_at IS NULL');
    expect(h.mediaScanQueue.enqueue).not.toHaveBeenCalled();
  });

  it('skips objects without a valid persisted payment-proof association at apply time', async () => {
    const h = makeHarness({ stillEligible: [false] });

    const result = await h.service.recover({ apply: true });

    expect(result.skippedCount).toBe(1);
    expect(result.enqueuedCount).toBe(0);
    expect(h.mediaScanQueue.enqueue).not.toHaveBeenCalled();
  });

  it('reports per-object enqueue errors without reporting success', async () => {
    const h = makeHarness({ enqueueFails: true });

    const result = await h.service.recover({ apply: true });

    expect(result.enqueuedCount).toBe(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({
      storageObjectId,
      error: 'redis unavailable',
    });
  });

  it('does not update orders, payments, storage objects, or scan status directly', async () => {
    const h = makeHarness();

    await h.service.recover({ apply: true });

    for (const call of h.manager.query.mock.calls) {
      expect((call[0] as string).trim().toUpperCase()).toMatch(/^SELECT/);
    }
  });

  it('maintains tenant isolation by using the tenant schema runner for candidate and eligibility checks', async () => {
    const h = makeHarness();

    await h.service.recover({ apply: true });

    expect(h.tenantRunner.withTenantCatalog).toHaveBeenCalledWith(
      tenantId,
      expect.any(Function),
    );
    expect(h.tenantRunner.withTenantCatalog).toHaveBeenCalledTimes(2);
  });

  it('is safe to rerun because it delegates duplicate-job handling to the deterministic queue producer', async () => {
    const h = makeHarness();

    await h.service.recover({ apply: true });
    await h.service.recover({ apply: true });

    expect(h.mediaScanQueue.enqueue).toHaveBeenCalledTimes(2);
    expect(h.mediaScanQueue.enqueue).toHaveBeenNthCalledWith(
      1,
      storageObjectId,
    );
    expect(h.mediaScanQueue.enqueue).toHaveBeenNthCalledWith(
      2,
      storageObjectId,
    );
  });
});
