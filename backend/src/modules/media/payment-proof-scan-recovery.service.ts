import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Tenant } from '../../common/entities/tenant.entity';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { MediaScanQueueService } from './media-scan-queue.service';

export type PaymentProofScanRecoveryMode = 'dry-run' | 'apply';

export type PaymentProofScanRecoveryCandidate = {
  tenantId: string;
  tenantSlug: string;
  storageObjectId: string;
  orderPaymentId: string;
  orderId: string;
};

export type PaymentProofScanRecoveryFailure =
  PaymentProofScanRecoveryCandidate & {
    error: string;
  };

export type PaymentProofScanRecoveryResult = {
  mode: PaymentProofScanRecoveryMode;
  tenantsChecked: number;
  candidateCount: number;
  skippedCount: number;
  enqueuedCount: number;
  failures: PaymentProofScanRecoveryFailure[];
  candidates: PaymentProofScanRecoveryCandidate[];
};

export type PaymentProofScanRecoveryOptions = {
  apply?: boolean;
  olderThanMs?: number;
  limitPerTenant?: number;
};

@Injectable()
export class PaymentProofScanRecoveryService {
  private static readonly DEFAULT_OLDER_THAN_MS = 60_000;
  private static readonly DEFAULT_LIMIT_PER_TENANT = 100;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tenantRunner: TenantSchemaRunner,
    private readonly mediaScanQueue: MediaScanQueueService,
  ) {}

  async recover(
    options: PaymentProofScanRecoveryOptions = {},
  ): Promise<PaymentProofScanRecoveryResult> {
    const apply = options.apply === true;
    const olderThanMs = this.positiveNumberOrDefault(
      options.olderThanMs,
      PaymentProofScanRecoveryService.DEFAULT_OLDER_THAN_MS,
    );
    const limitPerTenant = this.positiveNumberOrDefault(
      options.limitPerTenant,
      PaymentProofScanRecoveryService.DEFAULT_LIMIT_PER_TENANT,
    );
    const tenants = await this.dataSource.getRepository(Tenant).find({
      where: { tenantSchemaProvisioned: true },
      select: ['id', 'slug', 'tenantSchemaProvisioned'],
      order: { createdAt: 'ASC' },
    });

    const candidates: PaymentProofScanRecoveryCandidate[] = [];
    const failures: PaymentProofScanRecoveryFailure[] = [];
    let enqueuedCount = 0;
    let skippedCount = 0;

    for (const tenant of tenants) {
      const tenantCandidates = await this.tenantRunner.withTenantCatalog(
        tenant.id,
        (manager) =>
          this.findTenantCandidates(
            manager,
            tenant.id,
            tenant.slug,
            olderThanMs,
            limitPerTenant,
          ),
      );
      candidates.push(...tenantCandidates);

      if (!apply) continue;

      for (const candidate of tenantCandidates) {
        const stillEligible = await this.tenantRunner.withTenantCatalog(
          tenant.id,
          (manager) =>
            this.isStillEligible(manager, tenant.id, candidate.storageObjectId),
        );
        if (!stillEligible) {
          skippedCount += 1;
          continue;
        }

        try {
          await this.mediaScanQueue.enqueue(candidate.storageObjectId);
          enqueuedCount += 1;
        } catch (error) {
          failures.push({
            ...candidate,
            error: this.safeError(error),
          });
        }
      }
    }

    return {
      mode: apply ? 'apply' : 'dry-run',
      tenantsChecked: tenants.length,
      candidateCount: candidates.length,
      skippedCount,
      enqueuedCount,
      failures,
      candidates,
    };
  }

  private async findTenantCandidates(
    manager: EntityManager,
    tenantId: string,
    tenantSlug: string,
    olderThanMs: number,
    limit: number,
  ): Promise<PaymentProofScanRecoveryCandidate[]> {
    const cutoff = new Date(Date.now() - olderThanMs);
    const rows = await manager.query(
      `
        SELECT
          object.id AS "storageObjectId",
          payment.id AS "orderPaymentId",
          payment.order_id AS "orderId"
        FROM order_payments payment
        INNER JOIN orders ord
          ON ord.id = payment.order_id
          AND ord.deleted_at IS NULL
        INNER JOIN public.storage_objects object
          ON object.id = payment.payment_proof_storage_object_id
        WHERE payment.payment_proof_storage_object_id IS NOT NULL
          AND object.tenant_id = $1
          AND object.ownership_type = 'TENANT'
          AND object.object_category = 'payment_proof'
          AND object.access_scope = 'TENANT_PRIVATE'
          AND object.status = 'QUARANTINED'
          AND object.scan_required = true
          AND object.scan_status = 'QUARANTINED'
          AND object.deleted_at IS NULL
          AND object.created_at <= $2
        ORDER BY object.created_at ASC
        LIMIT $3
      `,
      [tenantId, cutoff, limit],
    );

    return rows.map(
      (row: {
        storageObjectId: string;
        orderPaymentId: string;
        orderId: string;
      }) => ({
        tenantId,
        tenantSlug,
        storageObjectId: row.storageObjectId,
        orderPaymentId: row.orderPaymentId,
        orderId: row.orderId,
      }),
    );
  }

  private async isStillEligible(
    manager: EntityManager,
    tenantId: string,
    storageObjectId: string,
  ): Promise<boolean> {
    const rows = await manager.query(
      `
        SELECT object.id
        FROM order_payments payment
        INNER JOIN orders ord
          ON ord.id = payment.order_id
          AND ord.deleted_at IS NULL
        INNER JOIN public.storage_objects object
          ON object.id = payment.payment_proof_storage_object_id
        WHERE payment.payment_proof_storage_object_id = $1
          AND object.id = $1
          AND object.tenant_id = $2
          AND object.ownership_type = 'TENANT'
          AND object.object_category = 'payment_proof'
          AND object.access_scope = 'TENANT_PRIVATE'
          AND object.status = 'QUARANTINED'
          AND object.scan_required = true
          AND object.scan_status = 'QUARANTINED'
          AND object.deleted_at IS NULL
        LIMIT 1
      `,
      [storageObjectId, tenantId],
    );
    return rows.length === 1;
  }

  private positiveNumberOrDefault(value: number | undefined, fallback: number) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? Math.floor(value)
      : fallback;
  }

  private safeError(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.slice(0, 200);
    }
    return 'Unknown recovery enqueue failure.';
  }
}
