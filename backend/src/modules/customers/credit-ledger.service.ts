import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreditTransaction } from '../../common/entities/credit-transaction.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CreditLedgerReferenceType } from '../../common/enums/credit-ledger-reference-type.enum';
import { CreditLedgerTransactionType } from '../../common/enums/credit-ledger-transaction-type.enum';

function toSignedMoney(v: string | number): string {
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) throw new BadRequestException('Invalid amount.');
  return n.toFixed(2);
}

@Injectable()
export class CreditLedgerService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(CreditTransaction) private readonly ledgerRepo: Repository<CreditTransaction>,
  ) {}

  async listForCustomer(
    tenantId: string,
    customerId: string,
    page: number,
    limit: number,
  ): Promise<{ data: CreditTransaction[]; total: number }> {
    const qb = this.ledgerRepo
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.customer_id = :customerId', { customerId })
      .orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /** Increases outstanding for a CREDIT order (idempotent per order). */
  async recordOrderDebit(params: {
    tenantId: string;
    customerId: string;
    orderId: string;
    orderTotal: string;
    createdBy?: string | null;
  }, manager?: EntityManager): Promise<{ applied: boolean; balanceAfter: string }> {
    const signed = toSignedMoney(Math.abs(Number(params.orderTotal)));
    return this.append({
      tenantId: params.tenantId,
      customerId: params.customerId,
      type: CreditLedgerTransactionType.ORDER_DEBIT,
      signedAmount: signed,
      referenceType: CreditLedgerReferenceType.ORDER,
      referenceId: params.orderId,
      createdBy: params.createdBy ?? null,
    }, manager);
  }

  /** Reverses an ORDER_DEBIT when a CREDIT order is cancelled before fulfilment. */
  async recordOrderReversal(params: {
    tenantId: string;
    customerId: string;
    orderId: string;
    orderTotal: string;
    createdBy?: string | null;
  }, manager?: EntityManager): Promise<{ applied: boolean; balanceAfter: string }> {
    const signed = toSignedMoney(-Math.abs(Number(params.orderTotal)));
    return this.append({
      tenantId: params.tenantId,
      customerId: params.customerId,
      type: CreditLedgerTransactionType.REVERSAL,
      signedAmount: signed,
      referenceType: CreditLedgerReferenceType.ORDER,
      referenceId: params.orderId,
      createdBy: params.createdBy ?? null,
    }, manager);
  }

  /** Reverses a fulfilled credit sale when a distributor approves a full return. */
  async recordReturnCredit(params: {
    tenantId: string;
    customerId: string;
    returnRequestId: string;
    orderTotal: string;
    createdBy?: string | null;
  }, manager?: EntityManager): Promise<{ applied: boolean; balanceAfter: string }> {
    const signed = toSignedMoney(-Math.abs(Number(params.orderTotal)));
    return this.append({
      tenantId: params.tenantId,
      customerId: params.customerId,
      type: CreditLedgerTransactionType.RETURN_CREDIT,
      signedAmount: signed,
      referenceType: CreditLedgerReferenceType.RETURN,
      referenceId: params.returnRequestId,
      createdBy: params.createdBy ?? null,
      allowNegativeBalance: true,
    }, manager);
  }

  /** Reduces outstanding when distributor approves payment proof (idempotent per payment row). */
  async recordPaymentProofCredit(params: {
    tenantId: string;
    customerId: string;
    paymentId: string;
    amount: string;
    createdBy?: string | null;
  }, manager?: EntityManager): Promise<{ applied: boolean; balanceAfter: string }> {
    const signed = toSignedMoney(-Math.abs(Number(params.amount)));
    return this.append({
      tenantId: params.tenantId,
      customerId: params.customerId,
      type: CreditLedgerTransactionType.PAYMENT_CREDIT,
      signedAmount: signed,
      referenceType: CreditLedgerReferenceType.PAYMENT,
      referenceId: params.paymentId,
      createdBy: params.createdBy ?? null,
    }, manager);
  }

  /** Manual “payment received” from distributor tools (each call is a new row). */
  /** One-time opening outstanding when a customer is created with non-zero opening balance. */
  async recordOpeningDebit(params: {
    tenantId: string;
    customerId: string;
    openingOwed: string;
    createdBy?: string | null;
  }): Promise<{ applied: boolean; balanceAfter: string }> {
    const signed = toSignedMoney(Math.abs(Number(params.openingOwed)));
    return this.append({
      tenantId: params.tenantId,
      customerId: params.customerId,
      type: CreditLedgerTransactionType.OPENING_BALANCE,
      signedAmount: signed,
      referenceType: CreditLedgerReferenceType.OPENING_BALANCE,
      referenceId: params.customerId,
      createdBy: params.createdBy ?? null,
    });
  }

  /** Bad debt / bankruptcy — reduces outstanding (new row each call; `reference_id` is unique). */
  async recordWriteOff(params: {
    tenantId: string;
    customerId: string;
    amount: string;
    createdBy: string;
  }): Promise<{ applied: boolean; balanceAfter: string }> {
    const signed = toSignedMoney(-Math.abs(Number(params.amount)));
    const referenceId = randomUUID();
    return this.append({
      tenantId: params.tenantId,
      customerId: params.customerId,
      type: CreditLedgerTransactionType.WRITE_OFF,
      signedAmount: signed,
      referenceType: CreditLedgerReferenceType.WRITE_OFF,
      referenceId,
      createdBy: params.createdBy,
    });
  }

  async recordManualPaymentCredit(params: {
    tenantId: string;
    customerId: string;
    amount: string;
    createdBy?: string | null;
  }): Promise<{ applied: boolean; balanceAfter: string }> {
    const signed = toSignedMoney(-Math.abs(Number(params.amount)));
    return this.append({
      tenantId: params.tenantId,
      customerId: params.customerId,
      type: CreditLedgerTransactionType.PAYMENT_CREDIT,
      signedAmount: signed,
      referenceType: CreditLedgerReferenceType.MANUAL_PAYMENT,
      referenceId: randomUUID(),
      createdBy: params.createdBy ?? null,
    });
  }

  async recordDistributorAdjustment(params: {
    tenantId: string;
    customerId: string;
    entryType:
      | CreditLedgerTransactionType.ADJUSTMENT_DEBIT
      | CreditLedgerTransactionType.ADJUSTMENT_CREDIT;
    magnitude: string;
    createdBy: string;
  }): Promise<{ applied: boolean; balanceAfter: string }> {
    const mag = Math.abs(Number(params.magnitude));
    if (!Number.isFinite(mag) || mag <= 0) throw new BadRequestException('Adjustment magnitude must be positive.');
    const signed =
      params.entryType === CreditLedgerTransactionType.ADJUSTMENT_DEBIT
        ? toSignedMoney(mag)
        : toSignedMoney(-mag);
    return this.append({
      tenantId: params.tenantId,
      customerId: params.customerId,
      type: params.entryType,
      signedAmount: signed,
      referenceType: CreditLedgerReferenceType.ADJUSTMENT,
      referenceId: randomUUID(),
      createdBy: params.createdBy,
    });
  }

  /**
   * Reconciliation: sum of signed `amount` should equal cached `customers.credit_balance`
   * for customers that already have at least one ledger row.
   */
  async findLedgerBalanceMismatches(take: number): Promise<
    Array<{ tenantId: string; customerId: string; cachedBalance: string; ledgerSum: string }>
  > {
    const rows: Array<{ tenant_id: string; customer_id: string; cached: string; ledger_sum: string }> =
      await this.ledgerRepo.query(
        `
        SELECT c.tenant_id AS tenant_id, c.id AS customer_id,
               c.credit_balance::text AS cached,
               COALESCE(SUM(t.amount), 0)::text AS ledger_sum
        FROM customers c
        INNER JOIN credit_transactions t ON t.customer_id = c.id AND t.tenant_id = c.tenant_id
        WHERE c.deleted_at IS NULL
        GROUP BY c.tenant_id, c.id, c.credit_balance
        HAVING c.credit_balance::numeric <> COALESCE(SUM(t.amount), 0)::numeric
        LIMIT $1
        `,
        [take],
      );
    return rows.map((r) => ({
      tenantId: r.tenant_id,
      customerId: r.customer_id,
      cachedBalance: r.cached,
      ledgerSum: r.ledger_sum,
    }));
  }

  async getOutstandingBalance(tenantId: string, customerId: string): Promise<string> {
    const row = await this.ledgerRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'balance')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.customer_id = :customerId', { customerId })
      .getRawOne<{ balance: string }>();
    return Number(row?.balance ?? 0).toFixed(2);
  }

  private async append(params: {
    tenantId: string;
    customerId: string;
    type: CreditLedgerTransactionType;
    signedAmount: string;
    referenceType: string;
    referenceId: string | null;
    createdBy: string | null;
    allowNegativeBalance?: boolean;
  }, transactionManager?: EntityManager): Promise<{ applied: boolean; balanceAfter: string }> {
    const work = async (manager: EntityManager) => {
      const cust = await manager
        .createQueryBuilder(Customer, 'c')
        .setLock('pessimistic_write')
        .where('c.id = :id', { id: params.customerId })
        .andWhere('c.tenant_id = :tid', { tid: params.tenantId })
        .andWhere('c.deleted_at IS NULL')
        .getOne();
      if (!cust) throw new NotFoundException('Customer not found.');

      const amt = Number(params.signedAmount);
      if (!Number.isFinite(amt) || Math.abs(amt) < 0.005) {
        throw new BadRequestException('Ledger amount must be non-zero.');
      }
      if (!params.referenceId) {
        throw new BadRequestException('Every ledger entry requires a reference.');
      }

      const existing = await manager.getRepository(CreditTransaction).findOne({
        where: {
          tenantId: params.tenantId,
          customerId: params.customerId,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          type: params.type,
        },
      });
      if (existing) {
        return { applied: false, balanceAfter: existing.balanceAfter };
      }

      const sum = await manager
        .getRepository(CreditTransaction)
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'balance')
        .where('t.tenant_id = :tenantId', { tenantId: params.tenantId })
        .andWhere('t.customer_id = :customerId', { customerId: params.customerId })
        .getRawOne<{ balance: string }>();
      const prev = Number(sum?.balance ?? 0);
      const rawNext = prev + amt;
      if (rawNext < -0.009 && !params.allowNegativeBalance) {
        throw new BadRequestException('Credit amount exceeds the outstanding balance.');
      }
      const next = Math.abs(rawNext) < 0.005 ? 0 : rawNext;
      const lim = Number(cust.creditLimit);
      if (next > lim + 1e-6) {
        throw new BadRequestException('Credit limit exceeded');
      }

      const balanceAfter = next.toFixed(2);
      const row = manager.getRepository(CreditTransaction).create({
        tenantId: params.tenantId,
        customerId: params.customerId,
        type: params.type,
        amount: params.signedAmount,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        balanceAfter,
        createdBy: params.createdBy,
      });

      try {
        await manager.save(CreditTransaction, row);
      } catch (e) {
        const code = (e as { driverError?: { code?: string } })?.driverError?.code;
        if (code === '23505') {
          return { applied: false, balanceAfter: cust.creditBalance };
        }
        throw e;
      }

      await manager.update(Customer, { id: cust.id }, { creditBalance: balanceAfter });
      return { applied: true, balanceAfter };
    };
    return transactionManager ? work(transactionManager) : this.dataSource.transaction(work);
  }
}
