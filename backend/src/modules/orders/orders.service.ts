import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { Cart } from '../../common/entities/cart.entity';
import { CartItem } from '../../common/entities/cart-item.entity';
import { Inventory } from '../../common/entities/inventory.entity';
import { OrderItem } from '../../common/entities/order-item.entity';
import { OrderPayment } from '../../common/entities/order-payment.entity';
import { OrderRequest } from '../../common/entities/order-request.entity';
import { ReplacementShipment } from '../../common/entities/replacement-shipment.entity';
import { Order } from '../../common/entities/order.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { Product } from '../../common/entities/product.entity';
import { ProductImage } from '../../common/entities/product-image.entity';
import { SystemConfig } from '../../common/entities/system-config.entity';
import { Customer } from '../../common/entities/customer.entity';
import { Tenant } from '../../common/entities/tenant.entity';
import { TenantOnboarding } from '../../common/entities/tenant-onboarding.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { User } from '../../common/entities/user.entity';
import { OrderSource } from '../../common/enums/order-source.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { effectiveGstPercent } from '../../common/utils/tax-resolution.util';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { CartService } from '../cart/cart.service';
import { CustomersCreditService } from '../customers/customers-credit.service';
import { CustomersService } from '../customers/customers.service';
import { InvoicesService } from '../invoices/invoices.service';
import { QUEUE_NAMES } from '../../workers/queues';
import {
  AppQueue,
  areQueuesEnabled,
  createAppQueue,
} from '../../workers/queue-factory';
import { PaymentActionDto } from './dto/payment-action.dto';
import { UploadPaymentProofDto } from './dto/upload-payment-proof.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import type { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  CreateOrderRequestDto,
  ReviewOrderRequestDto,
} from './dto/order-request.dto';
import { UsersService } from '../users/users.service';
import { PrivateDocumentsService } from '../private-documents/private-documents.service';
import { CouponsService, type AppliedCoupon } from '../coupons/coupons.service';
import { RazorpayIntegration } from '../../integrations/razorpay/razorpay.integration';
import {
  CanonicalOrderPaymentMode,
  isDeferredPaymentCheckoutMode,
  normalizePaymentMode,
  normalizePaymentStatus,
} from './order-payment-flow';
import { VerifyOrderRazorpayPaymentDto } from './dto/verify-order-razorpay-payment.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ACTIVE_ORDER_REQUEST_STATUSES,
  isCancellationEligibleStatus,
  isCancellationReason,
  isReplacementEligibleStatus,
  isReplacementReason,
  REPLACEMENT_REVIEW_TRANSITIONS,
} from './order-request-flow';

type OrderLineDraft = {
  productId: string;
  variantId: string | null;
  variantSku: string | null;
  quantity: number;
  price: string;
  taxRate: string;
  taxAmount: string;
  totalPrice: string;
};

type CheckoutLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
  priceSnapshot: string;
};

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function moneyString(value: string | undefined, fallback: string): string {
  const raw = value?.trim() || fallback;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestException('Payment amount must be greater than zero.');
  }
  return amount.toFixed(2);
}

function normalizeUtr(value: unknown): string {
  const utr = cleanText(value).toUpperCase();
  if (!/^[A-Z0-9]{6,35}$/.test(utr)) {
    throw new BadRequestException(
      'UTR must contain 6 to 35 letters or digits.',
    );
  }
  return utr;
}

@Injectable()
export class OrdersService implements OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);
  private readonly notificationQueue: AppQueue;
  private readonly notificationQueueEnabled: boolean;
  private readonly analyticsQueue: AppQueue;
  private readonly emailQueue: AppQueue;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tenantRunner: TenantSchemaRunner,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly cartService: CartService,
    private readonly customersCreditService: CustomersCreditService,
    private readonly customersService: CustomersService,
    private readonly invoicesService: InvoicesService,
    private readonly usersService: UsersService,
    private readonly privateDocuments: PrivateDocumentsService,
    private readonly couponsService: CouponsService,
    private readonly razorpay: RazorpayIntegration,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
    configService: ConfigService,
  ) {
    this.notificationQueueEnabled = areQueuesEnabled(configService);
    const queueOptions = {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      },
    };
    this.notificationQueue = createAppQueue(
      QUEUE_NAMES.notification,
      configService,
      queueOptions,
    );
    this.analyticsQueue = createAppQueue(
      QUEUE_NAMES.analytics,
      configService,
      queueOptions,
    );
    this.emailQueue = createAppQueue(
      QUEUE_NAMES.email,
      configService,
      queueOptions,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.notificationQueue.close(),
      this.analyticsQueue.close(),
      this.emailQueue.close(),
    ]);
  }

  /**
   * `orders.user_id` must reference `users`. WhatsApp buyers may never open the storefront; create or
   * link a `CUSTOMER` user for this `customers` row (same tenant + mobile).
   */
  private async resolveStorefrontUserForWhatsappOrder(
    tenantId: string,
    customerId: string,
  ): Promise<User> {
    const linked = await this.usersRepo.findOne({
      where: {
        tenantId,
        customerId,
        role: UserRole.CUSTOMER,
        deletedAt: IsNull(),
      },
    });
    if (linked) return linked;

    const customer = await this.dataSource.getRepository(Customer).findOne({
      where: { id: customerId, tenantId, deletedAt: IsNull() },
    });
    if (!customer) {
      throw new BadRequestException('Customer not found.');
    }
    const phone = customer.mobile?.trim();
    if (!phone) {
      throw new BadRequestException(
        'This customer has no mobile on file; add a mobile so orders can be linked to a storefront account.',
      );
    }

    const byPhone = await this.usersRepo.findOne({
      where: { tenantId, phone, role: UserRole.CUSTOMER, deletedAt: IsNull() },
    });
    if (byPhone) {
      if (byPhone.customerId && byPhone.customerId !== customerId) {
        throw new BadRequestException(
          'This mobile number is already linked to a different retailer account. Contact your distributor.',
        );
      }
      if (!byPhone.customerId) {
        byPhone.customerId = customerId;
        return this.usersRepo.save(byPhone);
      }
      return byPhone;
    }

    return this.usersService.create(
      {
        tenantId,
        phone,
        role: UserRole.CUSTOMER,
        email: customer.email?.trim()
          ? customer.email.trim().toLowerCase()
          : undefined,
        customerId,
      },
      undefined,
    );
  }

  private async findTenantIdForOrder(orderId: string): Promise<string | null> {
    const tenants = await this.dataSource.getRepository(Tenant).find({
      select: ['id', 'tenantSchemaProvisioned'],
    });
    for (const te of tenants) {
      if (!te.tenantSchemaProvisioned) continue;
      try {
        const n = await this.tenantRunner.withTenantCatalog(te.id, async (m) =>
          m
            .getRepository(Order)
            .count({ where: { id: orderId, deletedAt: IsNull() } }),
        );
        if (n > 0) return te.id;
      } catch {
        /* skip */
      }
    }
    return null;
  }

  async createOrder(user: JwtUserPayload, dto?: CreateOrderDto) {
    if (!user?.sub) {
      throw new UnauthorizedException(
        'Authentication required to place orders.',
      );
    }
    if (!user.tenantId) throw new ForbiddenException('Tenant user required.');
    const tid = user.tenantId;
    const isBuyNow = dto?.buyNow != null;
    if (isBuyNow && dto?.cartId) {
      throw new BadRequestException(
        'Buy Now checkout cannot include a cartId.',
      );
    }
    let cart: Cart | null = null;
    let items: CheckoutLine[];
    if (dto?.buyNow) {
      items = [
        {
          productId: dto.buyNow.productId,
          variantId: dto.buyNow.variantId ?? null,
          quantity: dto.buyNow.quantity,
          // Buy Now prices are always resolved from the catalog in the order
          // transaction below. Never trust a price supplied by the client.
          priceSnapshot: '0',
        },
      ];
    } else {
      const activeCart = await this.cartService.getCartItemsForUser(user);
      cart = activeCart.cart;
      items = activeCart.items;
    }
    if (items.length === 0) throw new BadRequestException('Cart is empty.');
    if (dto?.cartId && dto.cartId !== cart?.id) {
      throw new BadRequestException('cartId does not match the active cart.');
    }
    if (dto?.addressId && !user.customerId) {
      throw new BadRequestException(
        'Shipping address requires a retailer (customer) session.',
      );
    }
    if (dto?.addressId && user.customerId) {
      await this.customersService.assertShippingAddressForCustomer(
        tid,
        user.customerId,
        dto.addressId,
      );
    }
    const paymentMode = normalizePaymentMode(dto?.paymentMode);
    if (paymentMode === 'RAZORPAY' && !this.razorpay.isConfigured()) {
      throw new BadRequestException(
        'Online payment is not configured. Add Razorpay test credentials on the server.',
      );
    }
    const orderSource = isBuyNow
      ? OrderSource.BUY_NOW
      : user.role === UserRole.CUSTOMER
        ? OrderSource.STOREFRONT
        : dto?.orderSource === OrderSource.MANUAL
          ? OrderSource.MANUAL
          : OrderSource.STOREFRONT;

    const orderNumber = await this.generateOrderNumber(tid);

    const result = await this.tenantRunner.withTenantCatalog(
      tid,
      async (catalogManager) =>
        catalogManager.transaction(async (m) => {
          const productsRepo = m.getRepository(Product);
          const variantsRepo = m.getRepository(ProductVariant);
          const inventoryRepo = m.getRepository(Inventory);
          const ordersRepo = m.getRepository(Order);
          const orderItemsRepo = m.getRepository(OrderItem);

          const productIds = [...new Set(items.map((i) => i.productId))];
          const products = await productsRepo.findBy({
            id: In(productIds),
            deletedAt: IsNull(),
          });
          const productMap = new Map(products.map((p) => [p.id, p]));

          let subtotal = 0;
          let taxAmount = 0;
          const orderLines: OrderLineDraft[] = [];
          const reservations: { inv: Inventory; qty: number }[] = [];

          for (const item of items) {
            const product = productMap.get(item.productId);
            if (!product)
              throw new BadRequestException(
                `Product not found: ${item.productId}`,
              );
            if (product.tenantId !== tid)
              throw new ForbiddenException('Cross-tenant item in cart.');

            const inv = await inventoryRepo.findOne({
              where: {
                productId: item.productId,
                variantId: item.variantId ? item.variantId : IsNull(),
              },
            });
            const reserved = inv?.reservedStock ?? 0;
            const available = (inv?.stockQuantity ?? 0) - reserved;
            if (!inv || item.quantity > available) {
              throw new BadRequestException(
                'Insufficient stock for one or more items.',
              );
            }

            let variantSku: string | null = product.sku;
            let variantRow: ProductVariant | null = null;
            if (item.variantId) {
              variantRow = await variantsRepo.findOne({
                where: { id: item.variantId, deletedAt: IsNull() },
              });
              if (!variantRow)
                throw new BadRequestException(
                  `Variant not found: ${item.variantId}`,
                );
              if (variantRow.productId !== product.id) {
                throw new BadRequestException(
                  'Selected variant does not belong to the product.',
                );
              }
              variantSku = variantRow.variantSku ?? variantSku;
            }

            const moq = variantRow?.moq ?? 1;
            if (item.quantity < moq) {
              throw new BadRequestException(
                `Minimum order quantity is ${moq} for one or more items.`,
              );
            }

            const resolvedPrice = isBuyNow
              ? (variantRow?.price ?? product.price)
              : item.priceSnapshot;
            const itemPrice = Number(resolvedPrice);
            if (!Number.isFinite(itemPrice) || itemPrice < 0) {
              throw new BadRequestException('Invalid catalog price.');
            }
            const priceSnapshot = itemPrice.toFixed(2);
            const lineSubtotal = itemPrice * item.quantity;
            const taxRateStr = effectiveGstPercent({
              variantGstRate: variantRow?.gstRate ?? null,
              productTaxRate: product.taxRate,
            });
            const lineTax = (lineSubtotal * Number(taxRateStr)) / 100;
            subtotal += lineSubtotal;
            taxAmount += lineTax;

            orderLines.push({
              productId: item.productId,
              variantId: item.variantId,
              variantSku,
              quantity: item.quantity,
              price: priceSnapshot,
              taxRate: taxRateStr,
              taxAmount: lineTax.toFixed(2),
              totalPrice: (lineSubtotal + lineTax).toFixed(2),
            });

            reservations.push({ inv, qty: item.quantity });
          }

          const grossAmount = subtotal + taxAmount;
          let appliedCoupon: AppliedCoupon | null = null;
          if (dto?.couponCode) {
            appliedCoupon = await this.couponsService.applyForOrder(m, {
              tenantId: tid,
              code: dto.couponCode,
              grossTotal: grossAmount,
              customerId: user.customerId ?? null,
            });
          }
          const discountAmount = Number(appliedCoupon?.discountAmount ?? 0);
          const totalAmount = grossAmount - discountAmount;
          const totalStr = totalAmount.toFixed(2);
          if (user.customerId && paymentMode === 'CREDIT') {
            await this.customersCreditService.checkCustomerCredit(
              tid,
              user.customerId,
              totalStr,
            );
          }

          for (const { inv, qty } of reservations) {
            inv.reservedStock = (inv.reservedStock ?? 0) + qty;
            await inventoryRepo.save(inv);
          }

          const placedOrder = (await ordersRepo.save(
            ordersRepo.create({
              tenantId: tid,
              userId: user.sub,
              orderNumber,
              status: 'PENDING',
              subtotal: subtotal.toFixed(2),
              taxAmount: taxAmount.toFixed(2),
              totalAmount: totalStr,
              couponId: appliedCoupon?.coupon.id ?? null,
              couponCode: appliedCoupon?.coupon.code ?? null,
              discountAmount: discountAmount.toFixed(2),
              paymentStatus: 'PENDING',
              shippingAddressId: dto?.addressId ?? null,
              paymentMode,
              orderSource,
            }),
          )) as Order;

          for (const line of orderLines) {
            await orderItemsRepo.save(
              orderItemsRepo.create({ ...line, orderId: placedOrder.id }),
            );
          }

          if (appliedCoupon) {
            await this.couponsService.recordRedemption(m, {
              ...appliedCoupon,
              tenantId: tid,
              orderId: placedOrder.id,
              customerId: user.customerId ?? null,
            });
          }

          if (cart && !isDeferredPaymentCheckoutMode(paymentMode)) {
            await m
              .getRepository(CartItem)
              .createQueryBuilder()
              .softDelete()
              .where('cart_id = :cartId', { cartId: cart.id })
              .andWhere('deleted_at IS NULL')
              .execute();
          }

          if (user.customerId && paymentMode === 'CREDIT') {
            await this.customersCreditService.recordOrderDebitAfterPlace(
              {
                tenantId: tid,
                customerId: user.customerId,
                orderId: placedOrder.id,
                orderTotal: totalStr,
                createdBy: user.sub,
              },
              m,
            );
          }

          return { order: placedOrder, totalStr };
        }),
    );

    const { order } = result;
    const targetUser = await this.usersRepo.findOne({
      where: { id: order.userId },
    });
    const mode = normalizePaymentMode(order.paymentMode);
    if (mode !== 'UPI_QR' && mode !== 'NEFT') {
      await this.enqueueOrderCreated(order, targetUser?.email ?? '');
    }

    const paymentInstructions = await this.buildPaymentInstructions(
      order,
      targetUser,
    );
    return {
      success: true,
      data: {
        order_id: order.id,
        order_number: order.orderNumber,
        total_amount: order.totalAmount,
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
        couponCode: order.couponCode,
        payment_mode: order.paymentMode,
        payment_status: order.paymentStatus,
        paymentInstructions,
        payment_instructions: paymentInstructions,
      },
      meta: {},
      message: '',
    };
  }

  async createRazorpayOrder(user: JwtUserPayload, id: string) {
    if (!user.tenantId) {
      throw new ForbiddenException('Tenant user required.');
    }
    if (!this.razorpay.isConfigured()) {
      throw new BadRequestException(
        'Online payment is not configured. Add Razorpay test credentials on the server.',
      );
    }

    const outcome = await this.tenantRunner.withTenantCatalog(
      user.tenantId,
      (catalogManager) =>
        catalogManager.transaction(async (m) => {
          const ordersRepo = m.getRepository(Order);
          const paymentsRepo = m.getRepository(OrderPayment);
          const order = await ordersRepo.findOne({
            where: { id, deletedAt: IsNull() },
            lock: { mode: 'pessimistic_write' },
          });
          if (!order) throw new BadRequestException('Order not found.');
          this.assertRazorpayOrderAccess(user, order);

          let payment = await paymentsRepo.findOne({
            where: { orderId: order.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (payment && payment.paymentMethod !== 'RAZORPAY') {
            throw new ConflictException(
              'This order already has a different payment submission.',
            );
          }

          const amountPaise = Math.round(Number(order.totalAmount) * 100);
          if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
            throw new BadRequestException(
              'Online payment amount must be at least INR 1.00.',
            );
          }

          if (
            payment &&
            normalizePaymentStatus(payment.status) === 'VERIFIED'
          ) {
            await this.removeCommittedOrderItemsFromCart(m, order);
            return {
              order,
              payment,
              amountPaise,
              newlyVerified: false,
              alreadyPaid: true,
            };
          }
          if (order.status !== 'PENDING') {
            throw new BadRequestException(
              'Online payment can only be started for a pending order.',
            );
          }

          if (payment?.razorpayOrderId) {
            try {
              const providerPayments = await this.razorpay.fetchOrderPayments(
                payment.razorpayOrderId,
              );
              const captured = providerPayments.items.find(
                (item) =>
                  item.orderId === payment!.razorpayOrderId &&
                  item.status === 'captured' &&
                  item.amount === amountPaise &&
                  item.currency === 'INR',
              );
              if (captured) {
                const now = new Date();
                payment.razorpayPaymentId = captured.id;
                payment.paymentReference = captured.id;
                payment.status = 'VERIFIED';
                payment.submittedAt = payment.submittedAt ?? now;
                payment.verifiedAt = now;
                payment.verifiedBy = user.sub;
                payment.rejectedAt = null;
                payment.rejectionReason = null;
                await paymentsRepo.save(payment);
                order.paymentStatus = 'VERIFIED';
                order.status = 'PROCESSING';
                await ordersRepo.save(order);
                await this.removeCommittedOrderItemsFromCart(m, order);
                return {
                  order,
                  payment,
                  amountPaise,
                  newlyVerified: true,
                  alreadyPaid: true,
                };
              }
            } catch {
              // Checkout can still reuse the stored provider order during a lookup outage.
            }
            return {
              order,
              payment,
              amountPaise,
              newlyVerified: false,
              alreadyPaid: false,
            };
          }

          let providerOrder: Awaited<
            ReturnType<RazorpayIntegration['createOrder']>
          >;
          try {
            providerOrder = await this.razorpay.createOrder({
              amountPaise,
              currency: 'INR',
              receipt: `ord_${order.id.replace(/-/g, '')}`,
              notes: {
                tenant_id: order.tenantId,
                order_id: order.id,
                order_number: order.orderNumber,
                purpose: 'storefront_order',
              },
            });
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Unable to start Razorpay checkout.';
            throw new BadRequestException(message);
          }
          if (
            providerOrder.amount !== amountPaise ||
            providerOrder.currency.toUpperCase() !== 'INR' ||
            providerOrder.status.toLowerCase() !== 'created'
          ) {
            throw new BadRequestException(
              'Razorpay returned an invalid order amount, currency, or status.',
            );
          }

          if (!payment) {
            payment = paymentsRepo.create({
              orderId: order.id,
              tenantId: order.tenantId,
              paymentReference: providerOrder.id,
              paymentScreenshotUrl: null,
              paymentNote: `Online payment for order ${order.orderNumber}`,
              paymentMethod: 'RAZORPAY',
              utrNumber: null,
              amount: Number(order.totalAmount).toFixed(2),
              idempotencyKey: `razorpay:${order.id}`,
              status: 'PENDING',
              uploadedBy: user.sub,
              submittedAt: null,
              verifiedAt: null,
              verifiedBy: null,
              rejectedAt: null,
              rejectionReason: null,
              razorpayOrderId: providerOrder.id,
              razorpayPaymentId: null,
            });
          } else {
            payment.paymentReference = providerOrder.id;
            payment.amount = Number(order.totalAmount).toFixed(2);
            payment.idempotencyKey =
              payment.idempotencyKey || `razorpay:${order.id}`;
            payment.razorpayOrderId = providerOrder.id;
            payment.razorpayPaymentId = null;
            payment.status = 'PENDING';
          }
          payment = await paymentsRepo.save(payment);
          return {
            order,
            payment,
            amountPaise,
            newlyVerified: false,
            alreadyPaid: false,
          };
        }),
    );

    if (outcome.newlyVerified) {
      await this.afterRazorpayVerification(outcome.order, user);
    }
    const keyId = this.razorpay.getPublicKeyId();
    return {
      success: true,
      data: {
        orderId: outcome.order.id,
        orderNumber: outcome.order.orderNumber,
        paymentId: outcome.payment.id,
        razorpayOrderId: outcome.payment.razorpayOrderId,
        amountPaise: outcome.amountPaise,
        currency: 'INR',
        razorpayKeyId: keyId,
        alreadyPaid: outcome.alreadyPaid,
        testMode: keyId.startsWith('rzp_test_'),
      },
      meta: {},
      message: outcome.alreadyPaid ? 'Payment already verified.' : '',
    };
  }

  async abandonRazorpayOrder(user: JwtUserPayload, id: string) {
    if (!user.tenantId) {
      throw new ForbiddenException('Tenant user required.');
    }

    const snapshot = await this.tenantRunner.withTenantCatalog(
      user.tenantId,
      async (m) => {
        const order = await m.getRepository(Order).findOne({
          where: { id, deletedAt: IsNull() },
        });
        if (!order) throw new BadRequestException('Order not found.');
        this.assertRazorpayOrderAccess(user, order);
        const payment = await m.getRepository(OrderPayment).findOne({
          where: { orderId: order.id },
        });
        return { order, payment };
      },
    );

    if (snapshot.order.status === 'CANCELLED') {
      return {
        success: true,
        data: {
          orderId: snapshot.order.id,
          status: snapshot.order.status,
          paymentStatus: snapshot.order.paymentStatus,
        },
        meta: { idempotent: true },
        message: 'Online checkout was already cancelled.',
      };
    }
    if (
      snapshot.order.status !== 'PENDING' ||
      normalizePaymentStatus(snapshot.order.paymentStatus) === 'VERIFIED' ||
      normalizePaymentStatus(snapshot.payment?.status) === 'VERIFIED'
    ) {
      throw new ConflictException(
        'This online checkout can no longer be cancelled.',
      );
    }

    if (snapshot.payment?.razorpayOrderId) {
      let providerPayments: Awaited<
        ReturnType<RazorpayIntegration['fetchOrderPayments']>
      >;
      try {
        providerPayments = await this.razorpay.fetchOrderPayments(
          snapshot.payment.razorpayOrderId,
        );
      } catch {
        throw new ConflictException(
          'Unable to confirm the online payment status. Check Orders before trying again.',
        );
      }
      const paymentInProgress = providerPayments.items.some(
        (payment) =>
          payment.orderId === snapshot.payment!.razorpayOrderId &&
          (payment.status === 'authorized' || payment.status === 'captured'),
      );
      if (paymentInProgress) {
        throw new ConflictException(
          'Razorpay has already received this payment. Check Orders for verification.',
        );
      }
    }

    return this.tenantRunner.withTenantCatalog(
      user.tenantId,
      (catalogManager) =>
        catalogManager.transaction(async (m) => {
          const orders = m.getRepository(Order);
          const payments = m.getRepository(OrderPayment);
          const order = await orders.findOne({
            where: { id, deletedAt: IsNull() },
            lock: { mode: 'pessimistic_write' },
          });
          if (!order) throw new BadRequestException('Order not found.');
          this.assertRazorpayOrderAccess(user, order);
          if (order.status === 'CANCELLED') {
            return {
              success: true,
              data: {
                orderId: order.id,
                status: order.status,
                paymentStatus: order.paymentStatus,
              },
              meta: { idempotent: true },
              message: 'Online checkout was already cancelled.',
            };
          }
          const payment = await payments.findOne({
            where: { orderId: order.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (
            order.status !== 'PENDING' ||
            normalizePaymentStatus(order.paymentStatus) === 'VERIFIED' ||
            normalizePaymentStatus(payment?.status) === 'VERIFIED'
          ) {
            throw new ConflictException(
              'This online checkout can no longer be cancelled.',
            );
          }

          await this.releaseReservationForOrder(m, order.id);
          await this.couponsService.reverseRedemptionForOrder(m, order.id);
          order.status = 'CANCELLED';
          order.paymentStatus = 'REJECTED';
          await orders.save(order);
          if (payment) {
            payment.status = 'REJECTED';
            payment.rejectedAt = new Date();
            payment.rejectionReason = 'Online checkout cancelled by customer.';
            await payments.save(payment);
          }
          return {
            success: true,
            data: {
              orderId: order.id,
              status: order.status,
              paymentStatus: order.paymentStatus,
            },
            meta: { idempotent: false },
            message: 'Online checkout cancelled. Cart items were preserved.',
          };
        }),
    );
  }

  async abandonPendingPaymentOrder(user: JwtUserPayload, id: string) {
    if (!user.tenantId) {
      throw new ForbiddenException('Tenant user required.');
    }

    return this.tenantRunner.withTenantCatalog(
      user.tenantId,
      (catalogManager) =>
        catalogManager.transaction(async (m) => {
          const orders = m.getRepository(Order);
          const order = await orders.findOne({
            where: { id },
            withDeleted: true,
            lock: { mode: 'pessimistic_write' },
          });
          if (!order) throw new BadRequestException('Order not found.');
          this.assertStorefrontOrderAccess(user, order);

          const mode = normalizePaymentMode(order.paymentMode);
          if (mode !== 'UPI_QR' && mode !== 'NEFT') {
            throw new BadRequestException(
              'Only UPI QR or bank transfer checkout can be cancelled here.',
            );
          }
          if (order.deletedAt && order.status === 'CANCELLED') {
            return {
              success: true,
              data: {
                orderId: order.id,
                status: order.status,
                paymentStatus: order.paymentStatus,
              },
              meta: { idempotent: true },
              message: 'Payment checkout was already cancelled.',
            };
          }

          const payment = await m.getRepository(OrderPayment).findOne({
            where: { orderId: order.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (
            order.status !== 'PENDING' ||
            normalizePaymentStatus(order.paymentStatus) !== 'PENDING' ||
            payment
          ) {
            throw new ConflictException(
              'Payment details were already submitted. Check Orders before trying again.',
            );
          }

          await this.releaseReservationForOrder(m, order.id);
          await this.couponsService.reverseRedemptionForOrder(m, order.id);
          order.status = 'CANCELLED';
          order.paymentStatus = 'REJECTED';
          await orders.save(order);
          await orders.softDelete(order.id);

          return {
            success: true,
            data: {
              orderId: order.id,
              status: order.status,
              paymentStatus: order.paymentStatus,
            },
            meta: { idempotent: false },
            message: 'Payment checkout cancelled. Cart items were preserved.',
          };
        }),
    );
  }

  async verifyRazorpayPayment(
    user: JwtUserPayload,
    id: string,
    dto: VerifyOrderRazorpayPaymentDto,
  ) {
    if (!user.tenantId) {
      throw new ForbiddenException('Tenant user required.');
    }
    if (!this.razorpay.isConfigured()) {
      throw new BadRequestException('Online payment is not configured.');
    }

    const snapshot = await this.tenantRunner.withTenantCatalog(
      user.tenantId,
      async (m) => {
        const order = await m.getRepository(Order).findOne({
          where: { id, deletedAt: IsNull() },
        });
        if (!order) throw new BadRequestException('Order not found.');
        this.assertRazorpayOrderAccess(user, order);
        const payment = await m.getRepository(OrderPayment).findOne({
          where: { orderId: order.id },
        });
        if (!payment?.razorpayOrderId || payment.paymentMethod !== 'RAZORPAY') {
          throw new BadRequestException(
            'Razorpay checkout has not been started for this order.',
          );
        }
        return { order, payment };
      },
    );

    if (snapshot.payment.razorpayOrderId !== dto.razorpayOrderId) {
      throw new BadRequestException(
        'Razorpay order does not match this order.',
      );
    }
    if (
      normalizePaymentStatus(snapshot.payment.status) === 'VERIFIED' &&
      snapshot.payment.razorpayPaymentId === dto.razorpayPaymentId
    ) {
      await this.tenantRunner.withTenantCatalog(user.tenantId, (manager) =>
        manager.transaction((m) =>
          this.removeCommittedOrderItemsFromCart(m, snapshot.order),
        ),
      );
      return {
        success: true,
        data: {
          orderId: snapshot.order.id,
          status: snapshot.order.status,
          paymentStatus: 'VERIFIED',
        },
        meta: { idempotent: true },
        message: 'Payment already verified.',
      };
    }
    if (
      !this.razorpay.verifyPaymentSignature(
        snapshot.payment.razorpayOrderId,
        dto.razorpayPaymentId,
        dto.razorpaySignature,
      )
    ) {
      throw new BadRequestException('Invalid Razorpay payment signature.');
    }

    let providerPayment: Awaited<
      ReturnType<RazorpayIntegration['fetchPayment']>
    >;
    try {
      providerPayment = await this.razorpay.fetchPayment(dto.razorpayPaymentId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to verify Razorpay payment.';
      throw new BadRequestException(message);
    }
    const expectedPaise = Math.round(Number(snapshot.order.totalAmount) * 100);
    if (
      providerPayment.orderId !== snapshot.payment.razorpayOrderId ||
      providerPayment.id !== dto.razorpayPaymentId ||
      providerPayment.status !== 'captured' ||
      providerPayment.amount !== expectedPaise ||
      providerPayment.currency !== 'INR'
    ) {
      throw new BadRequestException(
        'Razorpay payment is not captured for the expected order amount and currency.',
      );
    }

    const outcome = await this.tenantRunner.withTenantCatalog(
      user.tenantId,
      (catalogManager) =>
        catalogManager.transaction(async (m) => {
          const ordersRepo = m.getRepository(Order);
          const paymentsRepo = m.getRepository(OrderPayment);
          const order = await ordersRepo.findOne({
            where: { id, deletedAt: IsNull() },
            lock: { mode: 'pessimistic_write' },
          });
          const payment = await paymentsRepo.findOne({
            where: { orderId: id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!order || !payment) {
            throw new BadRequestException('Order payment not found.');
          }
          this.assertRazorpayOrderAccess(user, order);
          if (
            payment.razorpayOrderId !== snapshot.payment.razorpayOrderId ||
            Number(payment.amount).toFixed(2) !==
              Number(order.totalAmount).toFixed(2)
          ) {
            throw new ConflictException(
              'Order payment changed while verification was in progress.',
            );
          }
          if (normalizePaymentStatus(payment.status) === 'VERIFIED') {
            if (payment.razorpayPaymentId !== providerPayment.id) {
              throw new ConflictException(
                'This Razorpay order is already settled with another payment.',
              );
            }
            await this.removeCommittedOrderItemsFromCart(m, order);
            return { order, payment, newlyVerified: false };
          }
          if (order.status !== 'PENDING') {
            throw new BadRequestException(
              'This order can no longer accept an online payment.',
            );
          }

          const now = new Date();
          payment.razorpayPaymentId = providerPayment.id;
          payment.paymentReference = providerPayment.id;
          payment.status = 'VERIFIED';
          payment.submittedAt = payment.submittedAt ?? now;
          payment.verifiedAt = now;
          payment.verifiedBy = user.sub;
          payment.rejectedAt = null;
          payment.rejectionReason = null;
          await paymentsRepo.save(payment);
          order.paymentStatus = 'VERIFIED';
          order.status = 'PROCESSING';
          await ordersRepo.save(order);
          await this.removeCommittedOrderItemsFromCart(m, order);
          return { order, payment, newlyVerified: true };
        }),
    );

    if (outcome.newlyVerified) {
      await this.afterRazorpayVerification(outcome.order, user);
    }
    return {
      success: true,
      data: {
        orderId: outcome.order.id,
        status: outcome.order.status,
        paymentStatus: outcome.payment.status,
        razorpayPaymentId: outcome.payment.razorpayPaymentId,
      },
      meta: { idempotent: !outcome.newlyVerified },
      message: 'Online payment verified successfully.',
    };
  }

  async handleRazorpayCapturedWebhook(input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    amountPaise: number;
    currency: string;
  }): Promise<{
    handled: boolean;
    verified?: boolean;
    idempotent?: boolean;
    reason?: string;
  }> {
    const tenantId = await this.findTenantIdForRazorpayOrder(
      input.razorpayOrderId,
    );
    if (!tenantId) {
      return { handled: false, reason: 'order_payment_not_found' };
    }

    const outcome = await this.tenantRunner.withTenantCatalog(
      tenantId,
      (catalogManager) =>
        catalogManager.transaction(async (m) => {
          const paymentsRepo = m.getRepository(OrderPayment);
          const ordersRepo = m.getRepository(Order);
          const payment = await paymentsRepo.findOne({
            where: { razorpayOrderId: input.razorpayOrderId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!payment || payment.paymentMethod !== 'RAZORPAY') {
            return {
              handled: false,
              verified: false,
              reason: 'order_payment_not_found',
            };
          }
          const order = await ordersRepo.findOne({
            where: { id: payment.orderId, deletedAt: IsNull() },
            lock: { mode: 'pessimistic_write' },
          });
          if (!order || order.tenantId !== tenantId) {
            return {
              handled: true,
              verified: false,
              reason: 'local_order_not_found',
            };
          }
          const expectedPaise = Math.round(Number(order.totalAmount) * 100);
          if (
            input.amountPaise !== expectedPaise ||
            input.currency.toUpperCase() !== 'INR'
          ) {
            return {
              handled: true,
              verified: false,
              reason: 'payment_amount_or_currency_mismatch',
            };
          }
          if (normalizePaymentStatus(payment.status) === 'VERIFIED') {
            await this.removeCommittedOrderItemsFromCart(m, order);
            return {
              handled: true,
              verified: payment.razorpayPaymentId === input.razorpayPaymentId,
              idempotent: true,
              reason:
                payment.razorpayPaymentId === input.razorpayPaymentId
                  ? undefined
                  : 'order_already_settled_with_another_payment',
            };
          }
          if (order.status !== 'PENDING') {
            return {
              handled: true,
              verified: false,
              reason: 'order_cannot_accept_payment',
            };
          }

          const now = new Date();
          payment.razorpayPaymentId = input.razorpayPaymentId;
          payment.paymentReference = input.razorpayPaymentId;
          payment.status = 'VERIFIED';
          payment.submittedAt = payment.submittedAt ?? now;
          payment.verifiedAt = now;
          payment.verifiedBy = null;
          payment.rejectedAt = null;
          payment.rejectionReason = null;
          await paymentsRepo.save(payment);
          order.paymentStatus = 'VERIFIED';
          order.status = 'PROCESSING';
          await ordersRepo.save(order);
          await this.removeCommittedOrderItemsFromCart(m, order);
          return {
            handled: true,
            verified: true,
            idempotent: false,
            order,
          };
        }),
    );

    if ('order' in outcome && outcome.order) {
      await this.afterRazorpayVerification(outcome.order);
    }
    return {
      handled: outcome.handled,
      verified: outcome.verified,
      idempotent: 'idempotent' in outcome ? outcome.idempotent : undefined,
      reason: 'reason' in outcome ? outcome.reason : undefined,
    };
  }

  /**
   * WhatsApp quick order: place order from explicit variant lines (no cart).
   * Same stock / MOQ / tax / credit rules as {@link createOrder}.
   */
  async createOrderFromVariantLines(params: {
    tenantId: string;
    customerId: string;
    lines: { variantId: string; quantity: number }[];
    paymentMode?: CanonicalOrderPaymentMode | 'PREPAID';
    orderSource?: OrderSource;
  }): Promise<{ orderId: string; orderNumber: string; totalAmount: string }> {
    const tid = params.tenantId;
    const { customerId } = params;
    const paymentMode = normalizePaymentMode(params.paymentMode);
    const orderSource = params.orderSource ?? OrderSource.WHATSAPP;
    const rawLines = params.lines;
    if (rawLines.length === 0) throw new BadRequestException('No order lines.');

    const merged = new Map<string, number>();
    for (const l of rawLines) {
      if (!l.variantId || !Number.isFinite(l.quantity) || l.quantity < 1) {
        throw new BadRequestException(
          'Each line needs a variant and a positive quantity.',
        );
      }
      merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + l.quantity);
    }
    const lines = [...merged.entries()].map(([variantId, quantity]) => ({
      variantId,
      quantity,
    }));

    const user = await this.resolveStorefrontUserForWhatsappOrder(
      tid,
      customerId,
    );

    const orderNumber = await this.generateOrderNumber(tid);

    const result = await this.tenantRunner.withTenantCatalog(
      tid,
      async (catalogManager) =>
        catalogManager.transaction(async (m) => {
          const productsRepo = m.getRepository(Product);
          const variantsRepo = m.getRepository(ProductVariant);
          const inventoryRepo = m.getRepository(Inventory);
          const ordersRepo = m.getRepository(Order);
          const orderItemsRepo = m.getRepository(OrderItem);

          type Resolved = {
            productId: string;
            variantId: string;
            quantity: number;
            priceSnapshot: string;
            variantRow: ProductVariant;
            product: Product;
          };
          const resolved: Resolved[] = [];

          for (const { variantId, quantity } of lines) {
            const variantRow = await variantsRepo.findOne({
              where: { id: variantId, deletedAt: IsNull() },
            });
            if (!variantRow)
              throw new BadRequestException(`Variant not found: ${variantId}`);
            const product = await productsRepo.findOne({
              where: { id: variantRow.productId, deletedAt: IsNull() },
            });
            if (!product) throw new BadRequestException('Product not found.');
            if (product.tenantId !== tid)
              throw new ForbiddenException('Invalid variant for tenant.');

            const inv = await inventoryRepo.findOne({
              where: { productId: product.id, variantId },
            });
            const reserved = inv?.reservedStock ?? 0;
            const available = (inv?.stockQuantity ?? 0) - reserved;
            if (!inv || quantity > available) {
              throw new BadRequestException(
                `Insufficient stock for ${product.name}.`,
              );
            }
            const moq = variantRow.moq ?? 1;
            if (quantity < moq) {
              throw new BadRequestException(
                `Minimum order quantity is ${moq} for ${product.name}.`,
              );
            }

            resolved.push({
              productId: product.id,
              variantId,
              quantity,
              priceSnapshot: variantRow.price,
              variantRow,
              product,
            });
          }

          let subtotal = 0;
          let taxAmount = 0;
          const orderLines: OrderLineDraft[] = [];
          const reservations: { inv: Inventory; qty: number }[] = [];

          for (const item of resolved) {
            const inv = await inventoryRepo.findOne({
              where: { productId: item.productId, variantId: item.variantId },
            });
            if (!inv) throw new BadRequestException('Inventory row missing.');
            const reserved = inv.reservedStock ?? 0;
            const available = inv.stockQuantity - reserved;
            if (item.quantity > available) {
              throw new BadRequestException('Insufficient stock.');
            }

            const variantSku = item.variantRow.variantSku ?? item.product.sku;
            const itemPrice = Number(item.priceSnapshot);
            const lineSubtotal = itemPrice * item.quantity;
            const taxRateStr = effectiveGstPercent({
              variantGstRate: item.variantRow.gstRate ?? null,
              productTaxRate: item.product.taxRate,
            });
            const lineTax = (lineSubtotal * Number(taxRateStr)) / 100;
            subtotal += lineSubtotal;
            taxAmount += lineTax;

            orderLines.push({
              productId: item.productId,
              variantId: item.variantId,
              variantSku,
              quantity: item.quantity,
              price: item.priceSnapshot,
              taxRate: taxRateStr,
              taxAmount: lineTax.toFixed(2),
              totalPrice: (lineSubtotal + lineTax).toFixed(2),
            });

            reservations.push({ inv, qty: item.quantity });
          }

          const totalAmount = subtotal + taxAmount;
          const totalStr = totalAmount.toFixed(2);
          if (customerId && paymentMode === 'CREDIT') {
            await this.customersCreditService.checkCustomerCredit(
              tid,
              customerId,
              totalStr,
            );
          }

          for (const { inv, qty } of reservations) {
            inv.reservedStock = (inv.reservedStock ?? 0) + qty;
            await inventoryRepo.save(inv);
          }

          const placedOrder = (await ordersRepo.save(
            ordersRepo.create({
              tenantId: tid,
              userId: user.id,
              orderNumber,
              status: 'PENDING',
              subtotal: subtotal.toFixed(2),
              taxAmount: taxAmount.toFixed(2),
              totalAmount: totalStr,
              paymentStatus: 'PENDING',
              shippingAddressId: null,
              paymentMode,
              orderSource,
            }),
          )) as Order;

          for (const line of orderLines) {
            await orderItemsRepo.save(
              orderItemsRepo.create({ ...line, orderId: placedOrder.id }),
            );
          }

          if (customerId && paymentMode === 'CREDIT') {
            await this.customersCreditService.recordOrderDebitAfterPlace(
              {
                tenantId: tid,
                customerId,
                orderId: placedOrder.id,
                orderTotal: totalStr,
                createdBy: user.id,
              },
              m,
            );
          }

          return { order: placedOrder, totalStr };
        }),
    );

    const { order } = result;
    await this.sendCustomerOrderNotification('ORDER_CREATED', order);
    await this.notifications.createForTenantStaff({
      tenantId: order.tenantId,
      type: 'ORDER_CREATED_BY_CUSTOMER',
      title: 'New order received',
      message: `Order ${order.orderNumber} has been placed for ${Number(order.totalAmount).toFixed(2)}.`,
      entityType: 'order',
      entityId: order.id,
      actionUrl: `/orders/${order.id}`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
      },
    });
    await this.analyticsQueue.add('ORDER_CREATED', {
      orderId: order.id,
      tenantId: order.tenantId,
      userId: order.userId,
      totalAmount: order.totalAmount,
    });
    const targetUser = await this.usersRepo.findOne({
      where: { id: order.userId },
    });
    await this.emailQueue.add('ORDER_CREATED', {
      orderId: order.id,
      tenantId: order.tenantId,
      userId: order.userId,
      email: targetUser?.email ?? '',
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
    };
  }

  private orderSourceFromListQuery(
    query?: ListOrdersQueryDto,
  ): OrderSource[] | undefined {
    const s = query?.source;
    if (!s) return undefined;
    if (s === 'whatsapp') return [OrderSource.WHATSAPP];
    if (s === 'manual') return [OrderSource.MANUAL];
    return [OrderSource.STOREFRONT, OrderSource.BUY_NOW];
  }

  private async withOrderPreviews(m: EntityManager, orders: Order[]) {
    if (!orders.length) return [];
    const orderItems = await m.getRepository(OrderItem).find({
      where: { orderId: In(orders.map((order) => order.id)) },
      order: { createdAt: 'ASC' },
    });
    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const item of orderItems) {
      const group = itemsByOrder.get(item.orderId) ?? [];
      group.push(item);
      itemsByOrder.set(item.orderId, group);
    }
    const previewItems = orders.flatMap((order) =>
      (itemsByOrder.get(order.id) ?? []).slice(0, 3),
    );
    const productIds = [...new Set(previewItems.map((item) => item.productId))];
    const [products, images] = productIds.length
      ? await Promise.all([
          m.getRepository(Product).find({
            where: { id: In(productIds) },
            select: ['id', 'name'],
          }),
          m.getRepository(ProductImage).find({
            where: { productId: In(productIds) },
            order: { isThumbnail: 'DESC', position: 'ASC' },
          }),
        ])
      : [[], []];
    const productNames = new Map(
      products.map((product) => [product.id, product.name]),
    );
    const productImages = new Map<string, string>();
    const genericImages = new Map<string, string>();
    const variantImages = new Map<string, string>();
    for (const image of images) {
      if (!productImages.has(image.productId)) {
        productImages.set(image.productId, image.imageUrl);
      }
      if (image.variantId && !variantImages.has(image.variantId)) {
        variantImages.set(image.variantId, image.imageUrl);
      }
      if (!image.variantId && !genericImages.has(image.productId)) {
        genericImages.set(image.productId, image.imageUrl);
      }
    }
    return orders.map((order) => {
      const items = itemsByOrder.get(order.id) ?? [];
      return {
        ...order,
        itemCount: items.length,
        unitCount: items.reduce((sum, item) => sum + item.quantity, 0),
        previewItems: items.slice(0, 3).map((item) => ({
          name:
            productNames.get(item.productId) ?? item.variantSku ?? 'Product',
          quantity: item.quantity,
          thumbnailUrl:
            (item.variantId ? variantImages.get(item.variantId) : undefined) ??
            genericImages.get(item.productId) ??
            productImages.get(item.productId) ??
            null,
        })),
      };
    });
  }

  async listOrders(user: JwtUserPayload, query?: ListOrdersQueryDto) {
    const isPlatform =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_SUPPORT;
    const sourceFilter = this.orderSourceFromListQuery(query);
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    if (isPlatform) {
      const tenants = await this.dataSource.getRepository(Tenant).find({
        where: { tenantSchemaProvisioned: true },
        select: ['id'],
      });
      const perTenant = await Promise.all(
        tenants.map((te) =>
          this.tenantRunner.withTenantCatalog(te.id, (m) =>
            m.getRepository(Order).findAndCount({
              where: sourceFilter ? { orderSource: In(sourceFilter) } : {},
              order: { createdAt: 'DESC' },
              take: page * limit,
            }),
          ),
        ),
      );
      const acc = perTenant.flatMap(([rows]) => rows);
      const total = perTenant.reduce((sum, [, count]) => sum + count, 0);
      acc.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      let data = acc.slice((page - 1) * limit, page * limit);
      if (query?.includePreviews && data.length) {
        const byTenant = new Map<string, Order[]>();
        for (const order of data) {
          const group = byTenant.get(order.tenantId) ?? [];
          group.push(order);
          byTenant.set(order.tenantId, group);
        }
        const enriched = await Promise.all(
          [...byTenant].map(([tenantId, tenantOrders]) =>
            this.tenantRunner.withTenantCatalog(tenantId, (m) =>
              this.withOrderPreviews(m, tenantOrders),
            ),
          ),
        );
        const previewsById = new Map(
          enriched.flat().map((order) => [order.id, order]),
        );
        data = data.map((order) => previewsById.get(order.id) ?? order);
      }
      return { success: true, data, meta: { page, limit, total }, message: '' };
    }
    if (!user.tenantId)
      throw new ForbiddenException('Tenant context required.');
    const tid = user.tenantId;
    const baseWhere =
      user.role === UserRole.CUSTOMER
        ? { tenantId: tid, userId: user.sub }
        : { tenantId: tid };
    const where = sourceFilter
      ? { ...baseWhere, orderSource: In(sourceFilter) }
      : baseWhere;
    const [data, total] = await this.tenantRunner.withTenantCatalog(
      tid,
      async (m) => {
        const [rows, count] = await m.getRepository(Order).findAndCount({
          where,
          order: { createdAt: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
        });
        return [
          query?.includePreviews ? await this.withOrderPreviews(m, rows) : rows,
          count,
        ] as const;
      },
    );
    return { success: true, data, meta: { page, limit, total }, message: '' };
  }

  async getOrder(user: JwtUserPayload, orderKey: string) {
    const byUuid = this.looksLikeUuid(orderKey);
    const tenantId =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_SUPPORT
        ? byUuid
          ? await this.findTenantIdForOrder(orderKey)
          : await this.findTenantIdForOrderNumber(orderKey)
        : user.tenantId;
    if (!tenantId) throw new BadRequestException('Order not found.');
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.PLATFORM_SUPPORT &&
      user.tenantId !== tenantId
    ) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const ordersRepo = m.getRepository(Order);
      const order = byUuid
        ? await ordersRepo.findOne({
            where: { id: orderKey, deletedAt: IsNull() },
          })
        : await ordersRepo.findOne({
            where: { orderNumber: orderKey, tenantId, deletedAt: IsNull() },
          });
      if (!order) throw new BadRequestException('Order not found.');
      if (user.role === UserRole.CUSTOMER && order.userId !== user.sub) {
        throw new ForbiddenException('Not your order.');
      }
      const items = await m.getRepository(OrderItem).find({
        where: { orderId: order.id },
        relations: { product: true },
        order: { createdAt: 'ASC' },
      });
      const productIds = [...new Set(items.map((item) => item.productId))];
      const imageRows = productIds.length
        ? await m.getRepository(ProductImage).find({
            where: { productId: In(productIds) },
            order: { isThumbnail: 'DESC', position: 'ASC' },
          })
        : [];
      const thumbnails = new Map<string, string>();
      const genericThumbnails = new Map<string, string>();
      const variantThumbnails = new Map<string, string>();
      for (const image of imageRows) {
        if (!thumbnails.has(image.productId)) {
          thumbnails.set(image.productId, image.imageUrl);
        }
        if (!image.variantId && !genericThumbnails.has(image.productId)) {
          genericThumbnails.set(image.productId, image.imageUrl);
        }
        if (image.variantId && !variantThumbnails.has(image.variantId)) {
          variantThumbnails.set(image.variantId, image.imageUrl);
        }
      }
      const displayItems = items.map((item) => ({
        ...item,
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              slug: item.product.slug,
              thumbnailUrl:
                (item.variantId
                  ? variantThumbnails.get(item.variantId)
                  : undefined) ??
                genericThumbnails.get(item.productId) ??
                thumbnails.get(item.productId) ??
                null,
            }
          : null,
      }));
      const payment = await m
        .getRepository(OrderPayment)
        .findOne({ where: { orderId: order.id } });
      const requests = await m.getRepository(OrderRequest).find({
        where: { orderId: order.id, tenantId },
        order: { createdAt: 'DESC' },
      });
      const shipments = requests.length
        ? await m.getRepository(ReplacementShipment).find({
            where: {
              tenantId,
              requestId: In(requests.map((request) => request.id)),
            },
          })
        : [];
      const shipmentByRequest = new Map(
        shipments.map((shipment) => [shipment.requestId, shipment]),
      );
      const buyer = await this.usersRepo.findOne({
        where: { id: order.userId },
      });
      const paymentInstructions = await this.buildPaymentInstructions(
        order,
        buyer,
      );
      return {
        success: true,
        data: {
          ...order,
          paymentStatus: normalizePaymentStatus(order.paymentStatus),
          items: displayItems,
          requests: requests.map((request) =>
            this.serializeOrderRequest(
              request,
              shipmentByRequest.get(request.id) ?? null,
            ),
          ),
          paymentInstructions,
          payment: payment
            ? {
                ...payment,
                paymentScreenshotUrl: this.privateDocuments.sign(
                  payment.paymentScreenshotUrl,
                ),
              }
            : null,
        },
        meta: {},
        message: '',
      };
    });
  }

  async timeline(user: JwtUserPayload, orderKey: string) {
    const response = await this.getOrder(user, orderKey);
    const order = response.data;
    const orderLabel = order.orderNumber ?? order.id;
    const baseDate = order.createdAt ?? new Date();
    const updatedDate = order.updatedAt ?? baseDate;
    const events = [
      {
        title: 'Order placed',
        status: 'PLACED',
        description: `Order ${orderLabel} was placed.`,
        createdAt: baseDate,
      },
      {
        title: `Order ${order.status}`,
        status: order.status,
        description: `Current order status is ${order.status}.`,
        createdAt: updatedDate,
      },
    ];
    if (order.paymentStatus) {
      events.push({
        title: `Payment ${order.paymentStatus}`,
        status: order.paymentStatus,
        description: `Current payment status is ${order.paymentStatus}.`,
        createdAt: updatedDate,
      });
    }
    return { success: true, data: events, meta: {}, message: '' };
  }

  async createRequest(
    user: JwtUserPayload,
    orderKey: string,
    dto: CreateOrderRequestDto,
    photos: Express.Multer.File[] = [],
  ) {
    const response = await this.getOrder(user, orderKey);
    const order = response.data as Order & { payment?: OrderPayment | null };
    if (dto.type === 'REPLACEMENT') {
      if (!isReplacementEligibleStatus(order.status)) {
        throw new BadRequestException(
          'Replacement is available only for delivered orders.',
        );
      }
      if (!isReplacementReason(dto.reason)) {
        throw new BadRequestException('Invalid replacement reason.');
      }
      if (!dto.description?.trim()) {
        throw new BadRequestException('Replacement description is required.');
      }
      if (photos.length < 1 || photos.length > 5) {
        throw new BadRequestException(
          'Upload between 1 and 5 replacement photos.',
        );
      }
    } else {
      if (!isCancellationEligibleStatus(order.status)) {
        throw new BadRequestException('This order can no longer be cancelled.');
      }
      if (!isCancellationReason(dto.reason)) {
        throw new BadRequestException('Invalid cancellation reason.');
      }
      if (photos.length > 0) {
        throw new BadRequestException(
          'Cancellation requests do not accept photos.',
        );
      }
    }

    let razorpayRefund: Awaited<
      ReturnType<RazorpayIntegration['refundPayment']>
    > | null = null;
    if (
      dto.type === 'CANCEL' &&
      normalizePaymentMode(order.paymentMode) === 'RAZORPAY' &&
      normalizePaymentStatus(order.paymentStatus) === 'VERIFIED'
    ) {
      if (!order.payment?.razorpayPaymentId) {
        throw new ConflictException(
          'Captured payment reference is missing; cancellation requires manual review.',
        );
      }
      if (!order.payment.razorpayRefundId) {
        try {
          razorpayRefund = await this.razorpay.refundPayment({
            paymentId: order.payment.razorpayPaymentId,
            amountPaise: Math.round(Number(order.totalAmount) * 100),
            notes: { orderId: order.id, reason: dto.reason },
          });
          const expectedPaise = Math.round(Number(order.totalAmount) * 100);
          if (
            razorpayRefund.paymentId !== order.payment.razorpayPaymentId ||
            razorpayRefund.amount !== expectedPaise ||
            !['pending', 'processed'].includes(razorpayRefund.status)
          ) {
            throw new Error(
              'Razorpay returned an invalid refund confirmation.',
            );
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Online payment refund failed.';
          throw new ConflictException(`Order was not cancelled: ${message}`);
        }
      }
    }

    const storedReferences: string[] = [];
    try {
      if (dto.type === 'REPLACEMENT') {
        for (const photo of photos) {
          const stored = await this.privateDocuments.store({
            tenantId: order.tenantId,
            category: 'return-photos',
            ownerId: order.id,
            file: photo,
          });
          storedReferences.push(stored.reference);
        }
      }

      const saved = await this.tenantRunner.withTenantCatalog(
        order.tenantId,
        (catalogManager) =>
          catalogManager.transaction(async (m) => {
            const requestsRepo = m.getRepository(OrderRequest);
            const ordersRepo = m.getRepository(Order);
            const active = await requestsRepo.findOne({
              where: {
                tenantId: order.tenantId,
                orderId: order.id,
                status: In([...ACTIVE_ORDER_REQUEST_STATUSES]),
              },
            });
            if (active) {
              throw new ConflictException(
                'An active request already exists for this order.',
              );
            }
            const lockedOrder = await ordersRepo.findOne({
              where: {
                id: order.id,
                tenantId: order.tenantId,
                deletedAt: IsNull(),
              },
              lock: { mode: 'pessimistic_write' },
            });
            if (!lockedOrder) throw new BadRequestException('Order not found.');

            if (dto.type === 'REPLACEMENT') {
              if (!isReplacementEligibleStatus(lockedOrder.status)) {
                throw new BadRequestException(
                  'Replacement is available only for delivered orders.',
                );
              }
              return requestsRepo.save(
                requestsRepo.create({
                  tenantId: order.tenantId,
                  distributorId: order.tenantId,
                  orderId: order.id,
                  requestedBy: user.sub,
                  type: 'REPLACEMENT',
                  reason: dto.reason,
                  description: dto.description!.trim(),
                  photoUrls: storedReferences,
                  status: 'REQUESTED',
                  reviewedBy: null,
                  reviewNote: null,
                  reviewedAt: null,
                }),
              );
            }

            if (!isCancellationEligibleStatus(lockedOrder.status)) {
              throw new BadRequestException(
                'This order can no longer be cancelled.',
              );
            }
            const payment = await m.getRepository(OrderPayment).findOne({
              where: { orderId: lockedOrder.id },
              lock: { mode: 'pessimistic_write' },
            });
            if (
              normalizePaymentMode(lockedOrder.paymentMode) === 'RAZORPAY' &&
              normalizePaymentStatus(lockedOrder.paymentStatus) === 'VERIFIED'
            ) {
              if (!payment?.razorpayRefundId && !razorpayRefund) {
                throw new ConflictException(
                  'A captured online payment must be refunded before cancellation.',
                );
              }
            }
            await this.releaseReservationForOrder(m, lockedOrder.id);
            await this.couponsService.reverseRedemptionForOrder(
              m,
              lockedOrder.id,
            );
            const buyer = await this.usersRepo.findOne({
              where: { id: lockedOrder.userId },
            });
            if (
              buyer?.customerId &&
              normalizePaymentMode(lockedOrder.paymentMode) === 'CREDIT'
            ) {
              await this.customersCreditService.recordOrderReversalOnCancel(
                {
                  tenantId: lockedOrder.tenantId,
                  customerId: buyer.customerId,
                  orderId: lockedOrder.id,
                  orderTotal: lockedOrder.totalAmount,
                  createdBy: user.sub,
                },
                m,
              );
            }
            if (payment) {
              if (razorpayRefund || payment.razorpayRefundId) {
                payment.razorpayRefundId =
                  payment.razorpayRefundId ?? razorpayRefund!.id;
                const refundProcessed =
                  !razorpayRefund || razorpayRefund.status === 'processed';
                payment.refundedAt = refundProcessed
                  ? (payment.refundedAt ?? new Date())
                  : null;
                payment.status = refundProcessed
                  ? 'REFUNDED'
                  : 'REFUND_PENDING';
              } else {
                payment.status =
                  normalizePaymentStatus(payment.status) === 'VERIFIED'
                    ? 'REFUND_PENDING'
                    : 'CANCELLED';
              }
              await m.getRepository(OrderPayment).save(payment);
              lockedOrder.paymentStatus = payment.status;
            }
            lockedOrder.status = 'CANCELLED';
            await ordersRepo.save(lockedOrder);
            return requestsRepo.save(
              requestsRepo.create({
                tenantId: order.tenantId,
                distributorId: order.tenantId,
                orderId: order.id,
                requestedBy: user.sub,
                type: 'CANCEL',
                reason: dto.reason,
                description: dto.note?.trim() || null,
                photoUrls: [],
                status: 'COMPLETED',
                reviewedBy: user.sub,
                reviewNote: null,
                reviewedAt: new Date(),
              }),
            );
          }),
      );
      await this.auditLogs.log({
        action:
          dto.type === 'CANCEL'
            ? 'ORDER_CANCELLED_BY_CUSTOMER'
            : 'ORDER_REPLACEMENT_REQUESTED',
        tenantId: order.tenantId,
        actorUserId: user.sub,
        metadata: {
          orderId: order.id,
          requestId: saved.id,
          reason: dto.reason,
          paymentMethod: order.paymentMode,
          refundId:
            razorpayRefund?.id ?? order.payment?.razorpayRefundId ?? null,
          refundStatus: razorpayRefund?.status ?? null,
        },
      });
      await this.notifications.createForTenantStaff({
        tenantId: order.tenantId,
        type:
          dto.type === 'CANCEL'
            ? 'ORDER_CANCELLED_BY_CUSTOMER'
            : 'REPLACEMENT_REQUESTED',
        title:
          dto.type === 'CANCEL'
            ? 'Order cancelled by customer'
            : 'Replacement request received',
        message:
          dto.type === 'CANCEL'
            ? `Order ${order.orderNumber} was cancelled. Reason: ${dto.reason}.`
            : `Order ${order.orderNumber} has a replacement request awaiting review.`,
        entityType: 'order',
        entityId: order.id,
        actionUrl: `/orders/${order.id}`,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          requestId: saved.id,
          reason: dto.reason,
        },
      });
      return {
        success: true,
        data: this.serializeOrderRequest(saved, null),
        meta: {},
        message:
          dto.type === 'CANCEL'
            ? 'Order cancelled.'
            : 'Replacement request submitted.',
      };
    } catch (error) {
      await Promise.allSettled(
        storedReferences.map((reference) =>
          this.privateDocuments.delete(reference),
        ),
      );
      const code = (error as { driverError?: { code?: string } })?.driverError
        ?.code;
      if (code === '23505') {
        throw new ConflictException(
          'An active request already exists for this order.',
        );
      }
      throw error;
    }
  }

  async listRequests(user: JwtUserPayload, orderId: string) {
    const response = await this.getOrder(user, orderId);
    const order = response.data as Order;
    return this.tenantRunner.withTenantCatalog(order.tenantId, async (m) => {
      const requests = await m.getRepository(OrderRequest).find({
        where: { tenantId: order.tenantId, orderId: order.id },
        order: { createdAt: 'DESC' },
      });
      const shipments = requests.length
        ? await m.getRepository(ReplacementShipment).find({
            where: {
              tenantId: order.tenantId,
              requestId: In(requests.map((request) => request.id)),
            },
          })
        : [];
      const shipmentByRequest = new Map(
        shipments.map((shipment) => [shipment.requestId, shipment]),
      );
      return {
        success: true,
        data: requests.map((request) =>
          this.serializeOrderRequest(
            request,
            shipmentByRequest.get(request.id) ?? null,
          ),
        ),
        meta: {},
        message: '',
      };
    });
  }

  async reviewRequest(
    user: JwtUserPayload,
    orderId: string,
    requestId: string,
    dto: ReviewOrderRequestDto,
  ) {
    const tenantId =
      user.role === UserRole.SUPER_ADMIN
        ? await this.findTenantIdForOrder(orderId)
        : user.tenantId;
    if (!tenantId) throw new BadRequestException('Order not found.');
    if (user.tenantId && user.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }
    if (['APPROVE', 'REJECT'].includes(dto.action) && !dto.note) {
      throw new BadRequestException('Review remarks are required.');
    }

    const result = await this.tenantRunner.withTenantCatalog(
      tenantId,
      (catalogManager) =>
        catalogManager.transaction(async (m) => {
          const requestsRepo = m.getRepository(OrderRequest);
          const order = await m.getRepository(Order).findOne({
            where: { id: orderId, tenantId, deletedAt: IsNull() },
          });
          const request = await requestsRepo.findOne({
            where: { id: requestId, orderId, tenantId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!order || !request)
            throw new BadRequestException('Order request not found.');
          if (request.type !== 'REPLACEMENT') {
            throw new BadRequestException(
              'Only replacement requests require admin review.',
            );
          }
          if (
            !(REPLACEMENT_REVIEW_TRANSITIONS[request.status] ?? []).includes(
              dto.action,
            )
          ) {
            throw new ConflictException(
              `Cannot ${dto.action.toLowerCase()} a ${request.status.toLowerCase()} request.`,
            );
          }
          const now = new Date();
          let shipment: ReplacementShipment | null = null;
          if (dto.action === 'START_REVIEW') {
            request.status = 'UNDER_REVIEW';
          } else if (dto.action === 'REJECT') {
            request.status = 'REJECTED';
            request.reviewedBy = user.sub;
            request.reviewedAt = now;
            request.reviewNote = dto.note!;
          } else if (dto.action === 'APPROVE') {
            if (!isReplacementEligibleStatus(order.status)) {
              throw new BadRequestException(
                'Replacement can be approved only for a delivered order.',
              );
            }
            request.status = 'APPROVED';
            request.reviewedBy = user.sub;
            request.reviewedAt = now;
            request.reviewNote = dto.note ?? null;
            const shipmentsRepo = m.getRepository(ReplacementShipment);
            shipment = await shipmentsRepo.findOne({
              where: { tenantId, requestId },
            });
            shipment ??= await shipmentsRepo.save(
              shipmentsRepo.create({
                tenantId,
                orderId,
                requestId,
                status: 'CREATED',
                createdBy: user.sub,
                shippedAt: null,
                completedAt: null,
              }),
            );
          } else {
            const shipmentsRepo = m.getRepository(ReplacementShipment);
            shipment = await shipmentsRepo.findOne({
              where: { tenantId, requestId },
              lock: { mode: 'pessimistic_write' },
            });
            if (!shipment)
              throw new BadRequestException('Replacement shipment not found.');
            if (dto.action === 'MARK_SHIPPED') {
              shipment.status = 'SHIPPED';
              shipment.shippedAt = now;
              request.status = 'REPLACEMENT_SHIPPED';
            } else {
              shipment.status = 'COMPLETED';
              shipment.completedAt = now;
              request.status = 'COMPLETED';
            }
            shipment = await shipmentsRepo.save(shipment);
          }
          const saved = await requestsRepo.save(request);
          return {
            success: true,
            data: this.serializeOrderRequest(saved, shipment),
            meta: {},
            message: `Replacement request ${saved.status.toLowerCase().replace(/_/g, ' ')}.`,
          };
        }),
    );
    await this.auditLogs.log({
      action: `ORDER_REPLACEMENT_${dto.action}`,
      tenantId,
      actorUserId: user.sub,
      metadata: { orderId, requestId, note: dto.note ?? null },
    });
    const reviewedOrder = await this.tenantRunner.withTenantCatalog(
      tenantId,
      (m) =>
        m
          .getRepository(Order)
          .findOne({ where: { id: orderId, tenantId, deletedAt: IsNull() } }),
    );
    if (reviewedOrder) {
      const requestStatus =
        (result.data as { status?: string }).status ?? dto.action;
      await this.notifications.createForUser({
        tenantId,
        userId: reviewedOrder.userId,
        type: `REPLACEMENT_${requestStatus}`,
        title: 'Replacement request updated',
        message: `Your replacement request for order ${reviewedOrder.orderNumber} is now ${requestStatus.toLowerCase().replace(/_/g, ' ')}.`,
        entityType: 'order',
        entityId: reviewedOrder.id,
        metadata: {
          orderId: reviewedOrder.id,
          orderNumber: reviewedOrder.orderNumber,
          requestId,
        },
      });
    }
    return result;
  }

  async updateStatus(
    user: JwtUserPayload,
    id: string,
    dto: UpdateOrderStatusDto,
  ) {
    const tenantId =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_SUPPORT
        ? await this.findTenantIdForOrder(id)
        : user.tenantId;
    if (!tenantId) throw new BadRequestException('Order not found.');
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.PLATFORM_SUPPORT &&
      user.tenantId !== tenantId
    ) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }

    const outcome = await this.tenantRunner.withTenantCatalog(
      tenantId,
      async (catalogManager) =>
        catalogManager.transaction(async (m) => {
          const ordersRepo = m.getRepository(Order);
          const order = await ordersRepo.findOne({
            where: { id, deletedAt: IsNull() },
          });
          if (!order) throw new BadRequestException('Order not found.');
          const previousStatus = order.status;

          if (dto.status === 'CANCELLED') {
            if (order.status === 'DELIVERED') {
              throw new BadRequestException('Cannot cancel a delivered order.');
            }
            if (
              order.status !== 'CANCELLED' &&
              normalizePaymentMode(order.paymentMode) === 'RAZORPAY' &&
              normalizePaymentStatus(order.paymentStatus) === 'VERIFIED'
            ) {
              throw new BadRequestException(
                'Refund the captured Razorpay payment before cancelling this order.',
              );
            }
            if (order.status !== 'CANCELLED') {
              await this.releaseReservationForOrder(m, order.id);
              const buyer = await this.usersRepo.findOne({
                where: { id: order.userId },
              });
              if (
                buyer?.customerId &&
                (order.paymentMode ?? 'CREDIT') === 'CREDIT' &&
                (order.status === 'PENDING' ||
                  order.status === 'PAYMENT_UPLOADED')
              ) {
                await this.customersCreditService.recordOrderReversalOnCancel(
                  {
                    tenantId: order.tenantId,
                    customerId: buyer.customerId,
                    orderId: order.id,
                    orderTotal: order.totalAmount,
                    createdBy: user.sub,
                  },
                  m,
                );
              }
            }
            order.status = 'CANCELLED';
            const saved = await ordersRepo.save(order);
            return {
              response: { success: true, data: saved, meta: {}, message: '' },
              previousStatus,
            };
          }

          if (dto.status === 'DELIVERED' && order.status === 'DISPATCHED') {
            await this.consumeStockOnDeliver(m, order.id);
            order.status = 'DELIVERED';
            const saved = await ordersRepo.save(order);
            return {
              response: { success: true, data: saved, meta: {}, message: '' },
              previousStatus,
            };
          }

          const mode = normalizePaymentMode(order.paymentMode);
          if (
            dto.status === 'PROCESSING' &&
            (mode === 'UPI_QR' || mode === 'NEFT' || mode === 'RAZORPAY') &&
            normalizePaymentStatus(order.paymentStatus) !== 'VERIFIED'
          ) {
            throw new BadRequestException(
              'Verify submitted payment before moving this order to processing.',
            );
          }

          order.status = dto.status;
          const saved = await ordersRepo.save(order);
          return {
            response: { success: true, data: saved, meta: {}, message: '' },
            previousStatus,
          };
        }),
    );

    if (outcome.previousStatus !== outcome.response.data.status) {
      const eventByStatus: Record<string, string> = {
        PENDING: 'ORDER_PENDING',
        PAYMENT_UPLOADED: 'PAYMENT_UPLOADED',
        PROCESSING: 'ORDER_ACCEPTED',
        DISPATCHED: 'ORDER_DISPATCHED',
        DELIVERED: 'ORDER_DELIVERED',
        CANCELLED: 'ORDER_CANCELLED',
      };
      await this.sendCustomerOrderNotification(
        eventByStatus[outcome.response.data.status] ?? 'ORDER_UPDATED',
        outcome.response.data,
      );
    }

    return outcome.response;
  }

  async uploadPaymentProof(
    user: JwtUserPayload,
    id: string,
    dto: UploadPaymentProofDto,
    file?: Express.Multer.File,
  ) {
    if (!user.tenantId)
      throw new ForbiddenException('Cross-tenant access denied.');
    return this.tenantRunner.withTenantCatalog(user.tenantId, async (m) => {
      const ordersRepo = m.getRepository(Order);
      const orderPaymentsRepo = m.getRepository(OrderPayment);

      const order = await ordersRepo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!order) throw new BadRequestException('Order not found.');
      if (order.tenantId !== user.tenantId)
        throw new ForbiddenException('Cross-tenant access denied.');
      if (user.role === UserRole.CUSTOMER && order.userId !== user.sub) {
        throw new ForbiddenException('Not your order.');
      }
      if (!['PENDING', 'PAYMENT_UPLOADED'].includes(order.status)) {
        throw new BadRequestException(
          'Payment proof can only be submitted before processing starts.',
        );
      }
      const mode = normalizePaymentMode(dto.paymentMode ?? order.paymentMode);
      if (mode !== 'UPI_QR' && mode !== 'NEFT') {
        throw new BadRequestException(
          'Payment proof submissions must use UPI_QR or NEFT.',
        );
      }

      const utrNumber = normalizeUtr(dto.utrNumber ?? dto.paymentReference);
      if (!file?.buffer?.length) {
        throw new BadRequestException('Payment proof file is required.');
      }

      let payment = await orderPaymentsRepo.findOne({
        where: { orderId: order.id },
      });
      const existingStatus = normalizePaymentStatus(payment?.status);
      if (
        payment &&
        dto.idempotencyKey &&
        payment.idempotencyKey === dto.idempotencyKey
      ) {
        if (payment.utrNumber !== utrNumber) {
          throw new ConflictException(
            'Idempotency key was already used for another submission.',
          );
        }
        return {
          success: true,
          data: {
            ...payment,
            paymentScreenshotUrl: this.privateDocuments.sign(
              payment.paymentScreenshotUrl,
            ),
          },
          meta: { duplicate: true },
          message: '',
        };
      }
      if (payment && existingStatus === 'VERIFIED') {
        throw new ConflictException(
          'Payment is already verified for this order.',
        );
      }
      if (payment && existingStatus === 'SUBMITTED') {
        throw new ConflictException(
          'Payment proof is already submitted and pending verification.',
        );
      }

      const duplicateUtr = await orderPaymentsRepo.findOne({
        where: { tenantId: order.tenantId, utrNumber },
      });
      if (duplicateUtr && duplicateUtr.orderId !== order.id) {
        throw new ConflictException(
          'This UTR has already been submitted for another order.',
        );
      }

      const submittedAt = new Date();
      const amount = moneyString(dto.amount, order.totalAmount);
      const expectedAmount = Number(order.totalAmount).toFixed(2);
      if (amount !== expectedAmount) {
        throw new BadRequestException(
          'Payment amount must exactly match the order total.',
        );
      }
      const note =
        cleanText(dto.paymentNote) ||
        `${mode} payment for order ${order.orderNumber}`;
      const previousProofUrl = payment?.paymentScreenshotUrl ?? null;
      const proofUrl = await this.persistPaymentProofFile(order, file);
      if (!payment) {
        payment = orderPaymentsRepo.create({
          orderId: order.id,
          tenantId: order.tenantId,
          paymentReference: utrNumber || null,
          paymentScreenshotUrl: proofUrl || null,
          paymentNote: note,
          paymentMethod: mode,
          utrNumber: utrNumber || null,
          amount,
          idempotencyKey: cleanText(dto.idempotencyKey) || null,
          status: 'SUBMITTED',
          uploadedBy: user.sub,
          submittedAt,
          verifiedAt: null,
          verifiedBy: null,
          rejectedAt: null,
          rejectionReason: null,
        });
      } else {
        payment.paymentReference = utrNumber || null;
        payment.paymentScreenshotUrl = proofUrl || null;
        payment.paymentNote = note;
        payment.paymentMethod = mode;
        payment.utrNumber = utrNumber || null;
        payment.amount = amount;
        payment.idempotencyKey =
          cleanText(dto.idempotencyKey) || payment.idempotencyKey;
        payment.status = 'SUBMITTED';
        payment.uploadedBy = user.sub;
        payment.submittedAt = submittedAt;
        payment.verifiedAt = null;
        payment.verifiedBy = null;
        payment.rejectedAt = null;
        payment.rejectionReason = null;
      }
      let savedPayment: OrderPayment;
      try {
        savedPayment = await m.transaction(async (transactionManager) => {
          const lockedOrder = await transactionManager
            .getRepository(Order)
            .findOne({
              where: { id: order.id, deletedAt: IsNull() },
              lock: { mode: 'pessimistic_write' },
            });
          if (
            !lockedOrder ||
            !['PENDING', 'PAYMENT_UPLOADED'].includes(lockedOrder.status)
          ) {
            throw new ConflictException(
              'This payment checkout is no longer active.',
            );
          }
          const saved = await transactionManager
            .getRepository(OrderPayment)
            .save(payment);
          lockedOrder.status = 'PAYMENT_UPLOADED';
          lockedOrder.paymentStatus = 'SUBMITTED';
          await transactionManager.getRepository(Order).save(lockedOrder);
          await this.removeCommittedOrderItemsFromCart(
            transactionManager,
            lockedOrder,
          );
          return saved;
        });
      } catch (error) {
        await this.privateDocuments.delete(proofUrl);
        throw error;
      }
      if (previousProofUrl && previousProofUrl !== proofUrl) {
        await this.privateDocuments.delete(previousProofUrl);
      }

      const targetUser = await this.usersRepo.findOne({
        where: { id: order.userId },
      });
      await this.enqueueOrderCreated(order, targetUser?.email ?? '');
      await this.sendCustomerOrderNotification('PAYMENT_UPLOADED', order);
      await this.notifications.createForTenantStaff({
        tenantId: order.tenantId,
        type: 'PAYMENT_PROOF_UPLOADED',
        title: 'Payment proof needs review',
        message: `Payment proof for order ${order.orderNumber} is ready to verify.`,
        entityType: 'order',
        entityId: order.id,
        actionUrl: `/orders/${order.id}`,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
      });
      await this.analyticsQueue.add('PAYMENT_UPLOADED', {
        orderId: order.id,
        tenantId: order.tenantId,
        userId: order.userId,
      });

      return {
        success: true,
        data: {
          ...savedPayment,
          paymentScreenshotUrl: this.privateDocuments.sign(
            savedPayment.paymentScreenshotUrl,
          ),
        },
        meta: {},
        message: 'Payment submitted for verification.',
      };
    });
  }

  async paymentAction(user: JwtUserPayload, id: string, dto: PaymentActionDto) {
    this.ensurePaymentAdminRole(user);
    const tenantId =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_SUPPORT
        ? await this.findTenantIdForOrder(id)
        : user.tenantId;
    if (!tenantId) throw new BadRequestException('Order not found.');
    if (user.tenantId && tenantId !== user.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }

    const outcome = await this.tenantRunner.withTenantCatalog(
      tenantId,
      async (catalogManager) =>
        catalogManager.transaction(async (m) => {
          const ordersRepo = m.getRepository(Order);
          const orderPaymentsRepo = m.getRepository(OrderPayment);
          const order = await ordersRepo
            .createQueryBuilder('o')
            .setLock('pessimistic_write')
            .where('o.id = :id', { id })
            .andWhere('o.deleted_at IS NULL')
            .getOne();
          if (!order) throw new BadRequestException('Order not found.');
          const payment = await orderPaymentsRepo
            .createQueryBuilder('p')
            .setLock('pessimistic_write')
            .where('p.order_id = :orderId', { orderId: order.id })
            .getOne();
          if (
            !payment ||
            normalizePaymentStatus(payment.status) !== 'SUBMITTED'
          ) {
            throw new BadRequestException('No submitted payment proof found.');
          }

          const verify = dto.action === 'approve' || dto.action === 'verify';
          if (verify) {
            if (!payment.utrNumber || !payment.paymentScreenshotUrl) {
              throw new BadRequestException(
                'UTR and payment proof are required before verification.',
              );
            }
            if (
              Number(payment.amount).toFixed(2) !==
              Number(order.totalAmount).toFixed(2)
            ) {
              throw new BadRequestException(
                'Submitted payment amount does not match the order total.',
              );
            }
            payment.status = 'VERIFIED';
            payment.verifiedAt = new Date();
            payment.verifiedBy = user.sub;
            payment.rejectedAt = null;
            payment.rejectionReason = null;
            await orderPaymentsRepo.save(payment);
            order.status = 'PROCESSING';
            order.paymentStatus = 'VERIFIED';
            await ordersRepo.save(order);

            const buyer = await m
              .getRepository(User)
              .findOne({ where: { id: order.userId } });
            if (
              buyer?.customerId &&
              normalizePaymentMode(order.paymentMode) === 'CREDIT'
            ) {
              await this.customersCreditService.recordPaymentProofApprovedCredit(
                {
                  tenantId: order.tenantId,
                  customerId: buyer.customerId,
                  paymentId: payment.id,
                  amount: order.totalAmount,
                  createdBy: user.sub,
                },
                m,
              );
            }
            return { order, payment, verified: true };
          }

          const reason = cleanText(dto.reason);
          if (!reason)
            throw new BadRequestException('Rejection reason is required.');
          payment.status = 'REJECTED';
          payment.rejectedAt = new Date();
          payment.verifiedAt = null;
          payment.verifiedBy = null;
          payment.rejectionReason = reason;
          await orderPaymentsRepo.save(payment);
          order.status = 'PENDING';
          order.paymentStatus = 'REJECTED';
          await ordersRepo.save(order);
          return { order, payment, verified: false };
        }),
    );

    const event = outcome.verified ? 'ORDER_PROCESSING' : 'PAYMENT_REJECTED';
    await this.sendCustomerOrderNotification(event, outcome.order);
    await this.analyticsQueue.add(event, {
      orderId: outcome.order.id,
      tenantId: outcome.order.tenantId,
      userId: outcome.order.userId,
    });
    if (outcome.verified) {
      await this.invoicesService.generateForOrder(
        outcome.order.id,
        outcome.order.tenantId,
        user,
      );
    }
    return {
      success: true,
      data: {
        orderId: outcome.order.id,
        status: outcome.order.status,
        paymentStatus: outcome.payment.status,
      },
      meta: {},
      message: outcome.verified
        ? 'Payment verified and order moved to processing'
        : 'Payment rejected',
    };
  }

  async dispatch(user: JwtUserPayload, id: string) {
    this.ensurePaymentAdminRole(user);
    const tenantId =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_SUPPORT
        ? await this.findTenantIdForOrder(id)
        : user.tenantId;
    if (!tenantId) throw new BadRequestException('Order not found.');
    if (user.tenantId && tenantId !== user.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const ordersRepo = m.getRepository(Order);
      const order = await ordersRepo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!order) throw new BadRequestException('Order not found.');
      if (order.status !== 'PROCESSING') {
        throw new BadRequestException(
          'Only PROCESSING orders can be dispatched.',
        );
      }
      order.status = 'DISPATCHED';
      const saved = await ordersRepo.save(order);
      await this.sendCustomerOrderNotification('ORDER_DISPATCHED', saved);
      await this.analyticsQueue.add('ORDER_DISPATCHED', {
        orderId: saved.id,
        tenantId: saved.tenantId,
        userId: saved.userId,
      });
      const targetUser = await this.usersRepo.findOne({
        where: { id: saved.userId },
      });
      await this.emailQueue.add('ORDER_DISPATCHED', {
        orderId: saved.id,
        tenantId: saved.tenantId,
        userId: saved.userId,
        email: targetUser?.email ?? '',
      });
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async deliver(user: JwtUserPayload, id: string) {
    this.ensurePaymentAdminRole(user);
    const tenantId =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_SUPPORT
        ? await this.findTenantIdForOrder(id)
        : user.tenantId;
    if (!tenantId) throw new BadRequestException('Order not found.');
    if (user.tenantId && tenantId !== user.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const ordersRepo = m.getRepository(Order);
      const order = await ordersRepo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!order) throw new BadRequestException('Order not found.');
      if (order.status !== 'DISPATCHED') {
        throw new BadRequestException(
          'Only DISPATCHED orders can be delivered.',
        );
      }
      await this.consumeStockOnDeliver(m, order.id);
      order.status = 'DELIVERED';
      const saved = await ordersRepo.save(order);
      await this.sendCustomerOrderNotification('ORDER_DELIVERED', saved);
      await this.analyticsQueue.add('ORDER_DELIVERED', {
        orderId: saved.id,
        tenantId: saved.tenantId,
        userId: saved.userId,
      });
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  private async releaseReservationForOrder(
    m: EntityManager,
    orderId: string,
  ): Promise<void> {
    const items = await m.getRepository(OrderItem).find({ where: { orderId } });
    const inventoryRepo = m.getRepository(Inventory);
    for (const line of items) {
      const inv = await inventoryRepo.findOne({
        where: {
          productId: line.productId,
          variantId: line.variantId ? line.variantId : IsNull(),
        },
      });
      if (!inv) continue;
      inv.reservedStock = Math.max(0, (inv.reservedStock ?? 0) - line.quantity);
      await inventoryRepo.save(inv);
    }
  }

  private async removeCommittedOrderItemsFromCart(
    m: EntityManager,
    order: Order,
  ): Promise<void> {
    // Buy Now is an isolated checkout. A matching product may already exist in
    // the user's real cart and must survive both successful and cancelled pay.
    if (order.orderSource === OrderSource.BUY_NOW) return;
    const cart = await m.getRepository(Cart).findOne({
      where: { tenantId: order.tenantId, userId: order.userId },
    });
    if (!cart) return;

    const [orderItems, cartItems] = await Promise.all([
      m.getRepository(OrderItem).find({ where: { orderId: order.id } }),
      m.getRepository(CartItem).find({
        where: { cartId: cart.id, deletedAt: IsNull() },
      }),
    ]);
    const orderLines = new Map(
      orderItems.map((item) => [
        `${item.productId}:${item.variantId ?? ''}`,
        item,
      ]),
    );
    const removableIds = cartItems
      .filter((item) => {
        const orderItem = orderLines.get(
          `${item.productId}:${item.variantId ?? ''}`,
        );
        return Boolean(
          orderItem &&
          item.quantity === orderItem.quantity &&
          Number(item.priceSnapshot).toFixed(2) ===
            Number(orderItem.price).toFixed(2) &&
          item.createdAt.getTime() <= order.createdAt.getTime(),
        );
      })
      .map((item) => item.id);
    if (removableIds.length === 0) return;
    await m.getRepository(CartItem).softDelete({ id: In(removableIds) });
  }

  private async consumeStockOnDeliver(
    m: EntityManager,
    orderId: string,
  ): Promise<void> {
    const items = await m.getRepository(OrderItem).find({ where: { orderId } });
    const inventoryRepo = m.getRepository(Inventory);
    for (const line of items) {
      const inv = await inventoryRepo.findOne({
        where: {
          productId: line.productId,
          variantId: line.variantId ? line.variantId : IsNull(),
        },
      });
      if (!inv) continue;
      inv.stockQuantity = Math.max(0, inv.stockQuantity - line.quantity);
      inv.reservedStock = Math.max(0, (inv.reservedStock ?? 0) - line.quantity);
      inv.stockStatus = inv.stockQuantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
      await inventoryRepo.save(inv);
    }
  }

  private async restoreReturnedStock(
    m: EntityManager,
    orderId: string,
  ): Promise<void> {
    const items = await m.getRepository(OrderItem).find({ where: { orderId } });
    const inventoryRepo = m.getRepository(Inventory);
    for (const line of items) {
      const inv = await inventoryRepo.findOne({
        where: {
          productId: line.productId,
          variantId: line.variantId ? line.variantId : IsNull(),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!inv)
        throw new BadRequestException(
          'Inventory row missing for returned item.',
        );
      inv.stockQuantity += line.quantity;
      inv.stockStatus = 'IN_STOCK';
      await inventoryRepo.save(inv);
    }
  }

  /**
   * Latest retailer order in the tenant catalog for the storefront `users` row
   * linked to `customerId` (`users.customer_id` + `users.tenant_id`).
   */
  async findLatestOrderForCustomer(
    tenantId: string,
    customerId: string,
  ): Promise<Order | null> {
    const user = await this.usersRepo.findOne({
      where: { tenantId, customerId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!user) return null;
    return this.tenantRunner.withTenantCatalog(tenantId, (m) =>
      m.getRepository(Order).findOne({
        where: { tenantId, userId: user.id, deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
      }),
    );
  }

  /** Latest order + line items (product names) for WhatsApp repeat-order UX. */
  async findLatestOrderWithItemsForCustomer(
    tenantId: string,
    customerId: string,
  ): Promise<{ order: Order; items: OrderItem[] } | null> {
    const order = await this.findLatestOrderForCustomer(tenantId, customerId);
    if (!order) return null;
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const items = await m.getRepository(OrderItem).find({
        where: { orderId: order.id },
        relations: ['product', 'variant'],
        order: { createdAt: 'ASC' },
      });
      return { order, items };
    });
  }

  private looksLikeUuid(s: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      s,
    );
  }

  private async findTenantIdForOrderNumber(
    orderNumber: string,
  ): Promise<string | null> {
    const tenants = await this.dataSource.getRepository(Tenant).find({
      where: { tenantSchemaProvisioned: true },
      select: ['id'],
    });
    for (const te of tenants) {
      try {
        const n = await this.tenantRunner.withTenantCatalog(te.id, (m) =>
          m
            .getRepository(Order)
            .count({ where: { orderNumber, deletedAt: IsNull() } }),
        );
        if (n > 0) return te.id;
      } catch {
        /* skip */
      }
    }
    return null;
  }

  private async findTenantIdForRazorpayOrder(
    razorpayOrderId: string,
  ): Promise<string | null> {
    const tenants = await this.dataSource.getRepository(Tenant).find({
      where: { tenantSchemaProvisioned: true },
      select: ['id', 'schemaName'],
    });
    for (const tenant of tenants) {
      if (!tenant.schemaName || !/^t_[a-f0-9]{32}$/.test(tenant.schemaName)) {
        continue;
      }
      const schema = `"${tenant.schemaName}"`;
      try {
        const rows: Array<{ value: number }> = await this.dataSource.query(
          `SELECT 1 AS value FROM ${schema}."order_payments"
           WHERE "razorpay_order_id" = $1 LIMIT 1`,
          [razorpayOrderId],
        );
        if (rows.length) return tenant.id;
      } catch {
        // A legacy tenant without the payment table cannot own this provider order.
      }
    }
    return null;
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const key = `tenant:${tenantId}:order_sequence`;
    const rows: Array<{ value: string }> = await this.configRepo.query(
      `INSERT INTO system_config (key, value)
       VALUES ($1, '1')
       ON CONFLICT (key) DO UPDATE
       SET value = ((COALESCE(NULLIF(system_config.value, ''), '0'))::bigint + 1)::text,
           updated_at = now()
       RETURNING value`,
      [key],
    );
    const next = Number(rows[0]?.value);
    if (!Number.isSafeInteger(next) || next < 1) {
      throw new BadRequestException('Unable to allocate an order number.');
    }
    return `ORD-${String(next).padStart(4, '0')}`;
  }

  private async persistPaymentProofFile(
    order: Order,
    file: Express.Multer.File,
  ): Promise<string> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Payment proof file is required.');
    }
    const stored = await this.privateDocuments.store({
      tenantId: order.tenantId,
      category: 'payment-proofs',
      ownerId: order.id,
      file,
    });
    return stored.reference;
  }

  private async buildPaymentInstructions(order: Order, user: User | null) {
    const mode = normalizePaymentMode(order.paymentMode);
    const base = {
      mode,
      status: normalizePaymentStatus(order.paymentStatus),
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      currency: 'INR',
    };
    if (mode !== 'UPI_QR') return base;

    const [profile, onboarding, customer] = await Promise.all([
      this.dataSource.getRepository(TenantProfile).findOne({
        where: { tenantId: order.tenantId },
      }),
      this.dataSource.getRepository(TenantOnboarding).findOne({
        where: { tenantId: order.tenantId },
      }),
      user?.customerId
        ? this.dataSource.getRepository(Customer).findOne({
            where: {
              id: user.customerId,
              tenantId: order.tenantId,
              deletedAt: IsNull(),
            },
          })
        : Promise.resolve(null),
    ]);
    const payload = (onboarding?.payloadJson ?? {}) as Record<string, unknown>;
    const upiId = cleanText(payload.upiId).replace(/\s+/g, '').toLowerCase();
    const payeeName =
      cleanText(payload.accountHolderName) ||
      profile?.businessName ||
      'Distributor';
    const retailerName =
      customer?.businessLegalName ||
      customer?.name ||
      user?.email ||
      user?.phone ||
      'Retailer';
    const transactionNote = `Order ${order.orderNumber} payment from ${retailerName}`;
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: Number(order.totalAmount).toFixed(2),
      cu: 'INR',
      tn: transactionNote,
      tr: order.orderNumber,
    });
    return {
      ...base,
      upiId,
      payeeName,
      retailerName,
      transactionNote,
      upiUri: upiId ? `upi://pay?${params.toString()}` : null,
    };
  }

  private assertStorefrontOrderAccess(
    user: JwtUserPayload,
    order: Order,
  ): void {
    if (!user.tenantId || order.tenantId !== user.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }
    if (user.role === UserRole.CUSTOMER && order.userId !== user.sub) {
      throw new ForbiddenException('Not your order.');
    }
  }

  private assertRazorpayOrderAccess(user: JwtUserPayload, order: Order): void {
    this.assertStorefrontOrderAccess(user, order);
    if (normalizePaymentMode(order.paymentMode) !== 'RAZORPAY') {
      throw new BadRequestException(
        'This order was not placed with Online Pay.',
      );
    }
  }

  private async sendCustomerOrderNotification(
    eventType: string,
    order: Order,
  ): Promise<void> {
    if (this.notificationQueueEnabled) {
      await this.notificationQueue.add(eventType, {
        orderId: order.id,
        tenantId: order.tenantId,
        userId: order.userId,
        entityType: 'order',
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
      });
      return;
    }

    const content: Record<string, { title: string; message: string }> = {
      ORDER_CREATED: {
        title: 'Order placed',
        message: 'Your order has been placed successfully.',
      },
      PAYMENT_UPLOADED: {
        title: 'Payment uploaded',
        message: 'Your payment proof has been uploaded.',
      },
      ORDER_PROCESSING: {
        title: 'Payment received',
        message: 'Your payment has been verified. Order is now processing.',
      },
      ORDER_ACCEPTED: {
        title: 'Order accepted',
        message: `Order ${order.orderNumber} has been accepted and is now processing.`,
      },
      ORDER_PENDING: {
        title: 'Order pending',
        message: `Order ${order.orderNumber} is pending.`,
      },
      PAYMENT_REJECTED: {
        title: 'Payment proof rejected',
        message:
          'Your payment proof could not be verified. Submit a valid proof.',
      },
      ORDER_DISPATCHED: {
        title: 'Order dispatched',
        message: 'Your order has been dispatched.',
      },
      ORDER_DELIVERED: {
        title: 'Order delivered',
        message: 'Your order has been delivered.',
      },
      ORDER_CANCELLED: {
        title: 'Order cancelled',
        message: `Order ${order.orderNumber} has been cancelled.`,
      },
    };
    const resolved = content[eventType] ?? {
      title: eventType,
      message: `Order ${order.orderNumber} was updated.`,
    };
    await this.notifications.createForUser({
      tenantId: order.tenantId,
      userId: order.userId,
      type: eventType,
      title: resolved.title,
      message: resolved.message,
      entityType: 'order',
      entityId: order.id,
      actionUrl: `/orders/${order.id}`,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });
  }

  private async enqueueOrderCreated(
    order: Order,
    email: string,
  ): Promise<void> {
    await this.sendCustomerOrderNotification('ORDER_CREATED', order);
    await this.notifications.createForTenantStaff({
      tenantId: order.tenantId,
      type: 'ORDER_CREATED_BY_CUSTOMER',
      title: 'New order received',
      message: `Order ${order.orderNumber} has been placed for ${Number(order.totalAmount).toFixed(2)}.`,
      entityType: 'order',
      entityId: order.id,
      actionUrl: `/orders/${order.id}`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
      },
    });
    await this.analyticsQueue.add('ORDER_CREATED', {
      orderId: order.id,
      tenantId: order.tenantId,
      userId: order.userId,
      totalAmount: order.totalAmount,
    });
    await this.emailQueue.add('ORDER_CREATED', {
      orderId: order.id,
      tenantId: order.tenantId,
      userId: order.userId,
      email,
    });
  }

  private async afterRazorpayVerification(
    order: Order,
    user?: JwtUserPayload,
  ): Promise<void> {
    await Promise.allSettled([
      this.sendCustomerOrderNotification('ORDER_PROCESSING', order),
      this.analyticsQueue.add('ORDER_PROCESSING', {
        orderId: order.id,
        tenantId: order.tenantId,
        userId: order.userId,
        paymentMethod: 'RAZORPAY',
      }),
    ]);
    await this.notifications.createForTenantStaff({
      tenantId: order.tenantId,
      type: 'ONLINE_PAYMENT_RECEIVED',
      title: 'Online payment received',
      message: `Online payment for order ${order.orderNumber} was verified.`,
      entityType: 'order',
      entityId: order.id,
      actionUrl: `/orders/${order.id}`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
      },
    });
    try {
      await this.invoicesService.generateForOrder(
        order.id,
        order.tenantId,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Invoice generation failed after Razorpay verification for order ${order.id}.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private serializeOrderRequest(
    request: OrderRequest,
    shipment: ReplacementShipment | null,
  ) {
    return {
      ...request,
      photoUrls: (request.photoUrls ?? [])
        .map((reference) => this.privateDocuments.sign(reference))
        .filter((url): url is string => Boolean(url)),
      replacementShipment: shipment,
    };
  }

  private ensurePaymentAdminRole(user: JwtUserPayload) {
    const allowed = [
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.SUPER_ADMIN,
      UserRole.PLATFORM_SUPPORT,
    ];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException(
        'Only OWNER, MANAGER, ADMIN roles can perform this action.',
      );
    }
  }
}
