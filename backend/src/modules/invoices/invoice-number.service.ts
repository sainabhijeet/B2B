import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import { Invoice } from '../../common/entities/invoice.entity';
import { TenantInvoiceCounter } from '../../common/entities/tenant-invoice-counter.entity';
import { indiaFinancialYearDateRange, indiaFinancialYearLabel } from '../../common/utils/india-financial-year.util';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';

export type InvoiceNumberAllocation = {
  invoiceNumber: string;
  financialYear: string;
  assignedSequence: number;
};

@Injectable()
export class InvoiceNumberService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(TenantInvoiceCounter)
    private readonly counterRepo: Repository<TenantInvoiceCounter>,
    private readonly tenantRunner: TenantSchemaRunner,
  ) {}

  /**
   * Concurrency-safe next number for `prefix/FY/NNNN` (India FY, April–March).
   * Runs in its own DB transaction on **public** `tenant_invoice_counters`.
   */
  async allocate(params: {
    tenantId: string;
    invoiceDate: Date;
    prefix: string;
    padding: number;
  }): Promise<InvoiceNumberAllocation> {
    const fy = indiaFinancialYearLabel(params.invoiceDate);
    const { start, end } = indiaFinancialYearDateRange(fy);
    const pad = Math.min(Math.max(Number(params.padding) || 4, 1), 12);
    const prefix = (params.prefix || 'INV').trim() || 'INV';

    return this.dataSource.transaction(async (em) => {
      const repo = em.getRepository(TenantInvoiceCounter);
      let row = await repo.findOne({
        where: { tenantId: params.tenantId, financialYear: fy },
        lock: { mode: 'pessimistic_write' },
      });

      if (!row) {
        const seed = await this.countInvoicesInFy(params.tenantId, start, end);
        const initialNext = Math.max(1, seed + 1);
        try {
          await repo.insert({
            tenantId: params.tenantId,
            financialYear: fy,
            nextNumber: initialNext,
          });
        } catch (e) {
          if ((e as { driverError?: { code?: string } })?.driverError?.code !== '23505') {
            throw e;
          }
        }
        row = await repo.findOneOrFail({
          where: { tenantId: params.tenantId, financialYear: fy },
          lock: { mode: 'pessimistic_write' },
        });
      }

      const n = row.nextNumber;
      await repo.update({ id: row.id }, { nextNumber: n + 1 });
      const padded = String(n).padStart(pad, '0');
      const invoiceNumber = `${prefix}/${fy}/${padded}`;
      return { invoiceNumber, financialYear: fy, assignedSequence: n };
    });
  }

  /**
   * If invoice persistence fails after `allocate`, roll back the counter bump when still sequential.
   */
  async releaseAllocation(params: {
    tenantId: string;
    financialYear: string;
    assignedSequence: number;
  }): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const repo = em.getRepository(TenantInvoiceCounter);
      const row = await repo.findOne({
        where: { tenantId: params.tenantId, financialYear: params.financialYear },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) return;
      if (row.nextNumber !== params.assignedSequence + 1) return;
      await repo.update({ id: row.id }, { nextNumber: params.assignedSequence });
    });
  }

  private async countInvoicesInFy(tenantId: string, start: string, end: string): Promise<number> {
    return this.tenantRunner.withTenantCatalog(tenantId, (m) =>
      m.getRepository(Invoice).count({
        where: { invoiceDate: Between(start, end) },
      }),
    );
  }
}
