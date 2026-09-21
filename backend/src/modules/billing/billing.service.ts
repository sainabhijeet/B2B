import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RazorpayIntegration } from '../../integrations/razorpay/razorpay.integration';
import { BillingInvoice } from '../../common/entities/billing-invoice.entity';
import { Payment } from '../../common/entities/payment.entity';
import { Plan } from '../../common/entities/plan.entity';
import { Subscription } from '../../common/entities/subscription.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AdminMarkPaymentDto } from './dto/admin-mark-payment.dto';
import { AdminUpdateSubscriptionDto } from './dto/admin-update-subscription.dto';
import { CreateRazorpayOrderDto } from './dto/create-razorpay-order.dto';
import { SubscribePlanDto } from './dto/subscribe-plan.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';
import { ReferralsService } from '../referrals/referrals.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrivateDocumentsService } from '../private-documents/private-documents.service';
import { OrdersService } from '../orders/orders.service';
import { randomBytes } from 'node:crypto';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Plan)
    private readonly plansRepo: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(BillingInvoice)
    private readonly invoicesRepo: Repository<BillingInvoice>,
    private readonly razorpay: RazorpayIntegration,
    private readonly referralsService: ReferralsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly privateDocuments: PrivateDocumentsService,
    private readonly ordersService: OrdersService,
  ) {}

  /** Razorpay server webhook: verify HMAC, idempotent mark SUCCESS, referral commission from captured amount. */
  async handleRazorpayWebhook(
    raw: Buffer,
    signature: string | undefined,
  ): Promise<{ unauthorized?: boolean; body?: Record<string, unknown> }> {
    if (!this.razorpay.verifyWebhookSignature(raw, signature)) {
      return { unauthorized: true };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString('utf8'));
    } catch {
      return { body: { ok: false, error: 'invalid_json' } };
    }
    if (!parsed || typeof parsed !== 'object') {
      return { body: { ok: true, ignored: true } };
    }
    const root = parsed as Record<string, unknown>;
    const event = typeof root.event === 'string' ? root.event : '';
    const payload = root.payload;
    const paymentWrap =
      payload && typeof payload === 'object' && 'payment' in payload
        ? (payload as Record<string, unknown>).payment
        : null;
    const entity =
      paymentWrap && typeof paymentWrap === 'object' && 'entity' in paymentWrap
        ? (paymentWrap as Record<string, unknown>).entity
        : null;
    if (!entity || typeof entity !== 'object') {
      return { body: { ok: true, ignored: true } };
    }
    const ent = entity as Record<string, unknown>;
    const orderId = typeof ent.order_id === 'string' ? ent.order_id : '';
    const paymentId = typeof ent.id === 'string' ? ent.id : '';
    const status =
      typeof ent.status === 'string' ? ent.status.toLowerCase() : '';
    const captured = event === 'payment.captured' || status === 'captured';
    if (!captured || !orderId || !paymentId) {
      return { body: { ok: true, ignored: true } };
    }
    const amountPaise =
      typeof ent.amount === 'number' ? ent.amount : Number(ent.amount);
    const currency =
      typeof ent.currency === 'string' ? ent.currency.toUpperCase() : '';
    const payment = await this.paymentsRepo.findOne({
      where: { razorpayOrderId: orderId },
    });
    if (!payment) {
      const storefront = await this.ordersService.handleRazorpayCapturedWebhook(
        {
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          amountPaise,
          currency,
        },
      );
      return {
        body: {
          ok: storefront.verified === true,
          storefront: storefront.handled,
          ignored: !storefront.handled,
          idempotent: storefront.idempotent ?? false,
          reason: storefront.reason,
        },
      };
    }
    if (payment.paymentStatus === 'SUCCESS') {
      return { body: { ok: true, idempotent: true } };
    }
    const expectedPaise = Math.round(Number(payment.amount) * 100);
    if (
      !Number.isInteger(amountPaise) ||
      amountPaise !== expectedPaise ||
      currency !== 'INR'
    ) {
      return {
        body: { ok: false, error: 'payment_amount_or_currency_mismatch' },
      };
    }
    const saved = await this.completePayment(payment.id, paymentId || null);
    await this.safeReferralPaid(saved, Number(saved.amount));
    return { body: { ok: true } };
  }

  private async safeReferralPaid(
    payment: Payment,
    amountInr: number,
  ): Promise<void> {
    try {
      await this.referralsService.onSubscriptionPaid({
        tenantId: payment.tenantId,
        subscriptionId: payment.subscriptionId,
        amountInr,
      });
    } catch {
      /* referral logic must not break billing */
    }
  }

  async getPlans() {
    const plans = await this.plansRepo.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
    return { success: true, data: plans, meta: {}, message: '' };
  }

  async subscribe(user: JwtUserPayload, dto: SubscribePlanDto) {
    const tenantId = this.resolveTenantId(user, dto.tenantId);
    const plan = await this.plansRepo.findOne({
      where: { id: dto.planId, isActive: true },
    });
    if (!plan) throw new NotFoundException('Plan not found.');

    const today = new Date();
    const startDate = today.toISOString().slice(0, 10);
    const end = new Date(today);
    end.setFullYear(
      end.getFullYear() + (plan.billingCycle === 'YEARLY' ? 1 : 0),
    );
    if (plan.billingCycle === 'MONTHLY') end.setMonth(end.getMonth() + 1);
    const endDate = end.toISOString().slice(0, 10);
    const trial = new Date(today);
    trial.setDate(trial.getDate() + 7);

    let subscription = await this.subscriptionsRepo.findOne({
      where: { tenantId },
    });
    if (!subscription) {
      subscription = this.subscriptionsRepo.create({
        tenantId,
        planId: plan.id,
        planName: plan.code,
        status: plan.code === 'FREE' ? 'TRIAL' : 'PENDING',
        startDate,
        endDate,
        expiryDate: endDate,
        trialEndsAt: plan.code === 'FREE' ? trial : null,
      });
    } else {
      subscription.planId = plan.id;
      subscription.planName = plan.code;
      subscription.status = plan.code === 'FREE' ? 'TRIAL' : 'PENDING';
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.expiryDate = endDate;
      subscription.trialEndsAt = plan.code === 'FREE' ? trial : null;
    }

    const saved = await this.subscriptionsRepo.save(subscription);
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async getTenantSubscription(user: JwtUserPayload) {
    if (!user.tenantId)
      throw new BadRequestException('Tenant context required.');
    const subscription = await this.subscriptionsRepo.findOne({
      where: { tenantId: user.tenantId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found.');
    return { success: true, data: subscription, meta: {}, message: '' };
  }

  async createPayment(user: JwtUserPayload, dto: CreatePaymentDto) {
    const tenantId = this.resolveTenantId(user, dto.tenantId);
    const subscription = await this.subscriptionsRepo.findOne({
      where: { id: dto.subscriptionId },
    });
    if (!subscription || subscription.tenantId !== tenantId) {
      throw new NotFoundException('Subscription not found.');
    }
    if (dto.paymentMethod === 'RAZORPAY') {
      throw new BadRequestException(
        'Use the Razorpay create-order endpoint for Razorpay payments.',
      );
    }
    const transactionReference = dto.transactionReference?.trim();
    if (!transactionReference) {
      throw new BadRequestException('Transaction reference is required.');
    }
    const duplicate = await this.paymentsRepo.findOne({
      where: { tenantId, transactionReference },
    });
    if (duplicate) {
      throw new BadRequestException(
        'This transaction reference has already been submitted.',
      );
    }
    const plan = subscription.planId
      ? await this.plansRepo.findOne({ where: { id: subscription.planId } })
      : null;
    const amount = String(plan?.price ?? 0);
    const payment = this.paymentsRepo.create({
      tenantId,
      subscriptionId: subscription.id,
      amount,
      paymentMethod: dto.paymentMethod,
      paymentStatus: 'PENDING',
      transactionReference,
    });
    const saved = await this.paymentsRepo.save(payment);
    return { success: true, data: saved, meta: {}, message: '' };
  }

  /** SaaS only: Razorpay Checkout for tenant paying the platform — not for end-customer orders. */
  async createRazorpayOrder(user: JwtUserPayload, dto: CreateRazorpayOrderDto) {
    if (!this.razorpay.isConfigured()) {
      throw new BadRequestException(
        'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      );
    }
    const tenantId = this.resolveTenantId(user, dto.tenantId);
    const subscription = await this.subscriptionsRepo.findOne({
      where: { id: dto.subscriptionId },
    });
    if (!subscription || subscription.tenantId !== tenantId) {
      throw new NotFoundException('Subscription not found.');
    }
    const plan = subscription.planId
      ? await this.plansRepo.findOne({ where: { id: subscription.planId } })
      : null;
    const priceInr = Number(plan?.price ?? 0);
    if (priceInr <= 0) {
      throw new BadRequestException(
        'Plan amount must be greater than zero for Razorpay checkout.',
      );
    }
    const amountPaise = Math.round(priceInr * 100);
    const receipt =
      `r${Date.now().toString(36)}${randomBytes(12).toString('hex')}`.slice(
        0,
        40,
      );
    let order: { id: string; amount: number; currency: string; status: string };
    try {
      order = await this.razorpay.createOrder({
        amountPaise,
        currency: 'INR',
        receipt,
        notes: { subscription_id: subscription.id, tenant_id: tenantId },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Razorpay request failed';
      throw new BadRequestException(msg);
    }
    const payment = this.paymentsRepo.create({
      tenantId,
      subscriptionId: subscription.id,
      amount: String(priceInr),
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'PENDING',
      transactionReference: order.id,
      razorpayOrderId: order.id,
      razorpayPaymentId: null,
    });
    const saved = await this.paymentsRepo.save(payment);
    return {
      success: true,
      data: {
        paymentId: saved.id,
        razorpayOrderId: order.id,
        amountPaise: order.amount,
        currency: order.currency,
        razorpayKeyId: this.razorpay.getPublicKeyId(),
      },
      meta: {},
      message: '',
    };
  }

  async verifyRazorpayPayment(
    user: JwtUserPayload,
    dto: VerifyRazorpayPaymentDto,
  ) {
    if (!this.razorpay.isConfigured()) {
      throw new BadRequestException('Razorpay is not configured.');
    }
    const tenantId = this.resolveTenantId(user, dto.tenantId);
    const ok = this.razorpay.verifyPaymentSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
    if (!ok) throw new BadRequestException('Invalid Razorpay signature.');
    const payment = await this.paymentsRepo.findOne({
      where: {
        razorpayOrderId: dto.razorpayOrderId,
        subscriptionId: dto.subscriptionId,
      },
    });
    if (!payment || payment.tenantId !== tenantId) {
      throw new NotFoundException('Payment not found for this order.');
    }
    if (payment.paymentStatus === 'SUCCESS') {
      if (payment.razorpayPaymentId !== dto.razorpayPaymentId) {
        throw new BadRequestException(
          'Razorpay order is already settled with another payment.',
        );
      }
      return {
        success: true,
        data: payment,
        meta: { idempotent: true },
        message: '',
      };
    }
    let providerPayment: Awaited<
      ReturnType<RazorpayIntegration['fetchPayment']>
    >;
    try {
      providerPayment = await this.razorpay.fetchPayment(dto.razorpayPaymentId);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Unable to verify Razorpay payment.';
      throw new BadRequestException(msg);
    }
    const expectedPaise = Math.round(Number(payment.amount) * 100);
    if (
      providerPayment.orderId !== dto.razorpayOrderId ||
      providerPayment.status !== 'captured' ||
      providerPayment.amount !== expectedPaise ||
      providerPayment.currency !== 'INR'
    ) {
      throw new BadRequestException(
        'Razorpay payment is not captured for the expected amount and currency.',
      );
    }
    const saved = await this.completePayment(payment.id, dto.razorpayPaymentId);
    await this.safeReferralPaid(saved, Number(saved.amount));
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async generateInvoice(user: JwtUserPayload, requestedTenantId?: string) {
    const tenantId = this.resolveTenantId(user, requestedTenantId);
    const subscription = await this.subscriptionsRepo.findOne({
      where: { tenantId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found.');
    const plan = subscription.planId
      ? await this.plansRepo.findOne({ where: { id: subscription.planId } })
      : null;
    const amount = String(plan?.price ?? 0);
    let saved = await this.invoicesRepo.manager.transaction(async (manager) => {
      const year = new Date().getFullYear();
      const prefix = `BILL/${year}/`;
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
        `billing-invoice:${year}`,
      ]);
      const count = await manager
        .getRepository(BillingInvoice)
        .createQueryBuilder('i')
        .where('i.invoice_number LIKE :prefix', { prefix: `${prefix}%` })
        .getCount();
      return manager.getRepository(BillingInvoice).save(
        manager.getRepository(BillingInvoice).create({
          tenantId,
          subscriptionId: subscription.id,
          invoiceNumber: `${prefix}${String(count + 1).padStart(6, '0')}`,
          amount,
          currency: 'INR',
          status: 'GENERATED',
          pdfUrl: null,
        }),
      );
    });
    const gst = Number(amount) * 0.18;
    const billingPeriod = `${subscription.startDate} to ${subscription.endDate ?? subscription.expiryDate ?? ''}`;
    const pdfUrl = await this.generateInvoicePdf({
      invoiceNumber: saved.invoiceNumber,
      planName: plan?.name ?? subscription.planName,
      amount: Number(amount),
      gst,
      billingPeriod,
      tenantId,
    });
    saved.pdfUrl = pdfUrl;
    saved = await this.invoicesRepo.save(saved);
    return {
      success: true,
      data: {
        ...saved,
        pdfUrl: this.privateDocuments.sign(saved.pdfUrl),
        planName: plan?.name ?? subscription.planName,
        gst,
        billingPeriod,
      },
      meta: {},
      message: '',
    };
  }

  async dashboard(user: JwtUserPayload) {
    if (user.role !== UserRole.SUPER_ADMIN && !user.tenantId) {
      throw new BadRequestException('Tenant context required.');
    }
    const tenantFilter =
      user.role === UserRole.SUPER_ADMIN ? {} : { tenantId: user.tenantId! };
    const activeSubscriptions = await this.subscriptionsRepo.count({
      where: { ...tenantFilter, status: 'ACTIVE' },
    });
    const expiringSoon = await this.subscriptionsRepo
      .createQueryBuilder('s')
      .where(
        user.role === UserRole.SUPER_ADMIN ? '1=1' : 's.tenant_id = :tenantId',
        {
          tenantId: user.tenantId,
        },
      )
      .andWhere(
        "s.end_date IS NOT NULL AND s.end_date <= (CURRENT_DATE + INTERVAL '7 days')",
      )
      .getCount();
    const monthlyRevenueRaw = await this.paymentsRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'sum')
      .where(
        user.role === UserRole.SUPER_ADMIN ? '1=1' : 'p.tenant_id = :tenantId',
        {
          tenantId: user.tenantId,
        },
      )
      .andWhere("p.payment_status = 'SUCCESS'")
      .andWhere(
        "date_trunc('month', p.created_at) = date_trunc('month', now())",
      )
      .getRawOne<{ sum: string }>();
    return {
      success: true,
      data: {
        active_subscriptions: activeSubscriptions,
        monthly_revenue: Number(monthlyRevenueRaw?.sum ?? 0),
        expiring_soon: expiringSoon,
      },
      meta: {},
      message: '',
    };
  }

  async adminSubscriptions() {
    const rows = await this.subscriptionsRepo.find({
      order: { createdAt: 'DESC' },
    });
    return { success: true, data: rows, meta: {}, message: '' };
  }

  async adminPayments() {
    const rows = await this.paymentsRepo.find({ order: { createdAt: 'DESC' } });
    return { success: true, data: rows, meta: {}, message: '' };
  }

  async adminUpdateSubscription(
    user: JwtUserPayload,
    dto: AdminUpdateSubscriptionDto,
  ) {
    const subscription = await this.subscriptionsRepo.findOne({
      where: { id: dto.subscriptionId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found.');
    if (dto.action === 'CANCEL') {
      subscription.status = 'CANCELLED';
    } else {
      if (!dto.endDate)
        throw new BadRequestException('endDate is required for EXTEND action.');
      subscription.endDate = dto.endDate;
      subscription.expiryDate = dto.endDate;
      subscription.status = 'ACTIVE';
    }
    const saved = await this.subscriptionsRepo.save(subscription);
    await this.auditLogsService.log({
      action: 'BILLING_SUBSCRIPTION_ADMIN_UPDATED',
      actorUserId: user.sub,
      tenantId: saved.tenantId,
      metadata: {
        subscriptionId: saved.id,
        action: dto.action,
        endDate: dto.endDate ?? null,
      },
    });
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async adminMarkPayment(user: JwtUserPayload, dto: AdminMarkPaymentDto) {
    const payment = await this.paymentsRepo.findOne({
      where: { id: dto.paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found.');
    const previousStatus = payment.paymentStatus;
    const saved =
      dto.paymentStatus === 'SUCCESS'
        ? await this.completePayment(payment.id, payment.transactionReference)
        : await this.paymentsRepo.save({
            ...payment,
            paymentStatus: dto.paymentStatus,
          });
    await this.auditLogsService.log({
      action: 'BILLING_PAYMENT_ADMIN_MARKED',
      actorUserId: user.sub,
      tenantId: saved.tenantId,
      metadata: {
        paymentId: saved.id,
        previousStatus,
        paymentStatus: saved.paymentStatus,
      },
    });
    if (dto.paymentStatus === 'SUCCESS' && previousStatus !== 'SUCCESS') {
      await this.safeReferralPaid(saved, Number(saved.amount));
    }
    return { success: true, data: saved, meta: {}, message: '' };
  }

  private async completePayment(
    paymentId: string,
    providerPaymentId: string | null,
  ): Promise<Payment> {
    return this.paymentsRepo.manager.transaction(async (manager) => {
      const payment = await manager
        .getRepository(Payment)
        .createQueryBuilder('p')
        .setLock('pessimistic_write')
        .where('p.id = :paymentId', { paymentId })
        .getOne();
      if (!payment) throw new NotFoundException('Payment not found.');
      if (payment.paymentStatus === 'SUCCESS') return payment;

      const subscription = await manager.getRepository(Subscription).findOne({
        where: { id: payment.subscriptionId, tenantId: payment.tenantId },
      });
      if (!subscription) throw new NotFoundException('Subscription not found.');
      const plan = subscription.planId
        ? await manager
            .getRepository(Plan)
            .findOne({ where: { id: subscription.planId, isActive: true } })
        : null;
      if (!plan)
        throw new BadRequestException('Subscription plan is unavailable.');
      if (Math.abs(Number(payment.amount) - Number(plan.price)) > 0.009) {
        throw new BadRequestException(
          'Payment amount does not match the subscription plan.',
        );
      }

      const start = new Date();
      const end = new Date(start);
      if (plan.billingCycle === 'YEARLY')
        end.setFullYear(end.getFullYear() + 1);
      if (plan.billingCycle === 'MONTHLY') end.setMonth(end.getMonth() + 1);
      subscription.status = 'ACTIVE';
      subscription.startDate = start.toISOString().slice(0, 10);
      subscription.endDate = end.toISOString().slice(0, 10);
      subscription.expiryDate = subscription.endDate;
      subscription.trialEndsAt = null;
      await manager.save(Subscription, subscription);

      payment.paymentStatus = 'SUCCESS';
      if (providerPaymentId) {
        payment.razorpayPaymentId =
          payment.paymentMethod === 'RAZORPAY'
            ? providerPaymentId
            : payment.razorpayPaymentId;
        payment.transactionReference = providerPaymentId;
      }
      return manager.save(Payment, payment);
    });
  }

  private async generateInvoicePdf(input: {
    invoiceNumber: string;
    planName: string;
    amount: number;
    gst: number;
    billingPeriod: string;
    tenantId: string;
  }): Promise<string> {
    const filename = `${input.invoiceNumber.replace(/\//g, '_')}.pdf`;
    const pdfContent = this.simplePdf([
      `Invoice Number: ${input.invoiceNumber}`,
      `Plan: ${input.planName}`,
      `Amount: INR ${input.amount.toFixed(2)}`,
      `GST (18%): INR ${input.gst.toFixed(2)}`,
      `Billing Period: ${input.billingPeriod}`,
      `Generated At: ${new Date().toISOString()}`,
    ]);
    const stored = await this.privateDocuments.storeBuffer({
      tenantId: input.tenantId,
      category: 'invoices',
      ownerId: input.invoiceNumber.replace(/[^A-Za-z0-9_-]/g, '_'),
      extension: '.pdf',
      contentType: 'application/pdf',
      originalName: filename,
      buffer: pdfContent,
    });
    return stored.reference;
  }

  private simplePdf(lines: string[]): Buffer {
    const escaped = lines
      .map((line) =>
        line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'),
      )
      .join('\\n');
    const stream = `BT /F1 12 Tf 50 750 Td (${escaped}) Tj ET`;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
      `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    ];
    let body = '%PDF-1.4\n';
    const offsets = [0];
    for (const obj of objects) {
      offsets.push(body.length);
      body += `${obj}\n`;
    }
    const xrefOffset = body.length;
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i += 1) {
      body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(body, 'utf8');
  }

  private resolveTenantId(
    user: JwtUserPayload,
    requestedTenantId?: string,
  ): string {
    if (user.tenantId) return user.tenantId;
    if (
      (user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.PLATFORM_SUPPORT) &&
      requestedTenantId
    ) {
      return requestedTenantId;
    }
    throw new BadRequestException('Tenant context required.');
  }
}
