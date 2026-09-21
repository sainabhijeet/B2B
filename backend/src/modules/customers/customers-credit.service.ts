import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerStatus } from '../../common/enums/customer-status.enum';
import { assertCreditAllowsPlaceOrder } from '../../common/utils/credit.util';
import { CreditLedgerService } from './credit-ledger.service';

function toMoneyString(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new BadRequestException('Invalid amount.');
  return n.toFixed(2);
}

@Injectable()
export class CustomersCreditService {
  constructor(
    @InjectRepository(Customer) private readonly customersRepo: Repository<Customer>,
    private readonly creditLedger: CreditLedgerService,
  ) {}

  /**
   * Checkout guard: `credit_balance + orderAmount` must not exceed `credit_limit`.
   * @throws BadRequestException `Credit limit exceeded`
   */
  async checkCustomerCredit(tenantId: string, customerId: string, orderAmount: string): Promise<void> {
    const c = await this.customersRepo.findOne({
      where: { id: customerId, tenantId, deletedAt: IsNull() },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    if (c.status !== CustomerStatus.ACTIVE) {
      throw new BadRequestException('Customer is not active.');
    }
    const outstanding = await this.creditLedger.getOutstandingBalance(tenantId, customerId);
    assertCreditAllowsPlaceOrder(outstanding, c.creditLimit, orderAmount);
  }

  /** After a placed CREDIT order — ledger `ORDER_DEBIT` (idempotent per order). */
  async recordOrderDebitAfterPlace(params: {
    tenantId: string;
    customerId: string;
    orderId: string;
    orderTotal: string;
    createdBy?: string | null;
  }, manager?: EntityManager): Promise<void> {
    await this.creditLedger.recordOrderDebit({
      tenantId: params.tenantId,
      customerId: params.customerId,
      orderId: params.orderId,
      orderTotal: toMoneyString(params.orderTotal),
      createdBy: params.createdBy ?? null,
    }, manager);
  }

  /** When a CREDIT order is cancelled before fulfilment — ledger `REVERSAL` (idempotent per order). */
  async recordOrderReversalOnCancel(params: {
    tenantId: string;
    customerId: string;
    orderId: string;
    orderTotal: string;
    createdBy?: string | null;
  }, manager?: EntityManager): Promise<void> {
    await this.creditLedger.recordOrderReversal({
      tenantId: params.tenantId,
      customerId: params.customerId,
      orderId: params.orderId,
      orderTotal: toMoneyString(params.orderTotal),
      createdBy: params.createdBy ?? null,
    }, manager);
  }

  /** Approved fulfilled return; a negative result is retained as customer credit. */
  async recordOrderReturn(params: {
    tenantId: string;
    customerId: string;
    returnRequestId: string;
    orderTotal: string;
    createdBy?: string | null;
  }, manager?: EntityManager): Promise<void> {
    await this.creditLedger.recordReturnCredit({
      tenantId: params.tenantId,
      customerId: params.customerId,
      returnRequestId: params.returnRequestId,
      orderTotal: toMoneyString(params.orderTotal),
      createdBy: params.createdBy ?? null,
    }, manager);
  }

  /** When payment proof is approved for a CREDIT order — ledger `PAYMENT_CREDIT` (idempotent per payment id). */
  async recordPaymentProofApprovedCredit(params: {
    tenantId: string;
    customerId: string;
    paymentId: string;
    amount: string;
    createdBy?: string | null;
  }, manager?: EntityManager): Promise<void> {
    await this.creditLedger.recordPaymentProofCredit({
      tenantId: params.tenantId,
      customerId: params.customerId,
      paymentId: params.paymentId,
      amount: toMoneyString(params.amount),
      createdBy: params.createdBy ?? null,
    }, manager);
  }

  /** Distributor extends max exposure (`credit_limit`). */
  async increaseCreditLimit(tenantId: string, customerId: string, amount: string): Promise<Customer> {
    const amt = toMoneyString(amount);
    const c = await this.requireCustomer(customerId, tenantId);
    const nextLimit = (Number(c.creditLimit) + Number(amt)).toFixed(2);
    if (Number(nextLimit) < Number(c.creditBalance)) {
      throw new BadRequestException('credit_limit cannot be less than current credit_balance.');
    }
    await this.customersRepo.update({ id: c.id }, { creditLimit: nextLimit });
    return (await this.customersRepo.findOne({ where: { id: c.id } })) as Customer;
  }

  /** Manual payment received — new `PAYMENT_CREDIT` / `MANUAL_PAYMENT` row each time. */
  async reduceCreditBalanceForPayment(
    tenantId: string,
    customerId: string,
    amount: string,
    createdBy?: string | null,
  ): Promise<Customer> {
    const amt = toMoneyString(amount);
    await this.creditLedger.recordManualPaymentCredit({
      tenantId,
      customerId,
      amount: amt,
      createdBy: createdBy ?? null,
    });
    const c = await this.customersRepo.findOne({
      where: { id: customerId, tenantId, deletedAt: IsNull() },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    return c;
  }

  private async requireCustomer(customerId: string, tenantId: string): Promise<Customer> {
    const c = await this.customersRepo.findOne({
      where: { id: customerId, tenantId, deletedAt: IsNull() },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    return c;
  }
}
