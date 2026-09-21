import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { InvoiceItem } from '../../common/entities/invoice-item.entity';
import { InvoiceSetting } from '../../common/entities/invoice-setting.entity';
import { Invoice } from '../../common/entities/invoice.entity';
import { OrderItem } from '../../common/entities/order-item.entity';
import { Order } from '../../common/entities/order.entity';
import { Tenant } from '../../common/entities/tenant.entity';
import { User } from '../../common/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { QUEUE_NAMES } from '../../workers/queues';
import {
  AppQueue,
  areQueuesEnabled,
  createAppQueue,
} from '../../workers/queue-factory';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { InvoiceNumberService } from './invoice-number.service';
import { PrivateDocumentsService } from '../private-documents/private-documents.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InvoicesService implements OnModuleDestroy {
  private readonly notificationQueueEnabled: boolean;
  private readonly notificationQueue: AppQueue;
  private readonly analyticsQueue: AppQueue;
  private readonly emailQueue: AppQueue;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tenantRunner: TenantSchemaRunner,
    @InjectRepository(InvoiceSetting)
    private readonly invoiceSettingsRepo: Repository<InvoiceSetting>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly privateDocuments: PrivateDocumentsService,
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

  async generate(user: JwtUserPayload, dto: GenerateInvoiceDto) {
    const tenantId =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_SUPPORT
        ? await this.findTenantIdForOrder(dto.orderId)
        : user.tenantId;
    if (!tenantId) throw new BadRequestException('Order not found.');
    return this.generateForOrder(dto.orderId, tenantId, user);
  }

  async generateForOrder(
    orderId: string,
    tenantId: string,
    user?: JwtUserPayload,
  ) {
    const pre = await this.tenantRunner.withTenantCatalog(
      tenantId,
      async (m) => {
        const ordersRepo = m.getRepository(Order);
        const invoicesRepo = m.getRepository(Invoice);
        const order = await ordersRepo.findOne({
          where: { id: orderId, deletedAt: IsNull() },
        });
        if (!order) throw new BadRequestException('Order not found.');
        if (order.status !== 'PROCESSING') {
          throw new BadRequestException(
            'Invoice can only be generated when order is PROCESSING.',
          );
        }
        if (user?.tenantId && order.tenantId !== user.tenantId) {
          throw new ForbiddenException('Cross-tenant access denied.');
        }
        const existing = await invoicesRepo.findOne({
          where: { orderId: order.id },
        });
        if (existing) return { existing };
        return { existing: null };
      },
    );

    if (pre.existing) {
      return {
        success: true,
        data: pre.existing,
        meta: {},
        message: 'Already generated',
      };
    }

    const settings = await this.getOrCreateInvoiceSettings(tenantId);
    const invoiceDate = new Date();
    const invoiceDateStr = invoiceDate.toISOString().slice(0, 10);

    let alloc: {
      invoiceNumber: string;
      financialYear: string;
      assignedSequence: number;
    } | null = null;
    try {
      alloc = await this.invoiceNumberService.allocate({
        tenantId,
        invoiceDate,
        prefix: settings.invoicePrefix,
        padding: settings.counterPadding ?? 4,
      });

      return await this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
        const ordersRepo = m.getRepository(Order);
        const invoicesRepo = m.getRepository(Invoice);
        const invoiceItemsRepo = m.getRepository(InvoiceItem);
        const orderItemsRepo = m.getRepository(OrderItem);

        const order = await ordersRepo.findOne({
          where: { id: orderId, deletedAt: IsNull() },
        });
        if (!order) throw new BadRequestException('Order not found.');
        if (order.status !== 'PROCESSING') {
          throw new BadRequestException(
            'Invoice can only be generated when order is PROCESSING.',
          );
        }
        if (user?.tenantId && order.tenantId !== user.tenantId) {
          throw new ForbiddenException('Cross-tenant access denied.');
        }
        const existing2 = await invoicesRepo.findOne({
          where: { orderId: order.id },
        });
        if (existing2) {
          await this.invoiceNumberService.releaseAllocation({
            tenantId,
            financialYear: alloc!.financialYear,
            assignedSequence: alloc!.assignedSequence,
          });
          return {
            success: true,
            data: existing2,
            meta: {},
            message: 'Already generated',
          };
        }

        const invoice = await invoicesRepo.save(
          invoicesRepo.create({
            tenantId: order.tenantId,
            orderId: order.id,
            invoiceNumber: alloc!.invoiceNumber,
            invoicePrefix: settings.invoicePrefix,
            invoiceFormat: 'PREFIX/FY/COUNTER',
            invoiceDate: invoiceDateStr,
            gstNumber: null,
            totalAmount: order.totalAmount,
            status: 'GENERATED',
          }),
        );

        const lines = await orderItemsRepo.find({
          where: { orderId: order.id },
        });
        for (const li of lines) {
          await invoiceItemsRepo.save(
            invoiceItemsRepo.create({
              invoiceId: invoice.id,
              productId: li.productId,
              variantId: li.variantId,
              variantSku: li.variantSku,
              quantity: li.quantity,
              price: li.price,
              taxRate: li.taxRate,
              taxAmount: li.taxAmount,
              totalPrice: li.totalPrice,
            }),
          );
        }

        const notification = {
          invoiceId: invoice.id,
          orderId: order.id,
          tenantId: order.tenantId,
          userId: order.userId,
          entityType: 'invoice',
          actionUrl: `/orders/${order.id}`,
          title: 'Invoice generated',
          message: `Invoice ${invoice.invoiceNumber} for order ${order.orderNumber} is ready.`,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            orderId: order.id,
            orderNumber: order.orderNumber,
          },
        };
        if (this.notificationQueueEnabled) {
          await this.notificationQueue.add('INVOICE_GENERATED', notification);
        } else {
          await this.notifications.createForUser({
            ...notification,
            type: 'INVOICE_GENERATED',
            entityId: invoice.id,
          });
        }
        await this.analyticsQueue.add('INVOICE_GENERATED', {
          invoiceId: invoice.id,
          orderId: order.id,
          tenantId: order.tenantId,
          userId: order.userId,
        });
        const targetUser = await this.usersRepo.findOne({
          where: { id: order.userId },
        });
        await this.emailQueue.add('INVOICE_GENERATED', {
          invoiceId: invoice.id,
          orderId: order.id,
          tenantId: order.tenantId,
          userId: order.userId,
          email: targetUser?.email ?? '',
        });
        return { success: true, data: invoice, meta: {}, message: '' };
      });
    } catch (e) {
      if (alloc) {
        await this.invoiceNumberService.releaseAllocation({
          tenantId,
          financialYear: alloc.financialYear,
          assignedSequence: alloc.assignedSequence,
        });
      }
      throw e;
    }
  }

  async list(user: JwtUserPayload) {
    const isPlatform =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_SUPPORT;
    if (isPlatform) {
      const tenants = await this.dataSource.getRepository(Tenant).find({
        where: { tenantSchemaProvisioned: true },
        select: ['id'],
      });
      const acc: Invoice[] = [];
      for (const te of tenants) {
        const rows = await this.tenantRunner.withTenantCatalog(te.id, (m) =>
          m.getRepository(Invoice).find({ order: { createdAt: 'DESC' } }),
        );
        acc.push(...rows);
      }
      acc.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return { success: true, data: acc, meta: {}, message: '' };
    }
    if (!user.tenantId)
      throw new ForbiddenException('Tenant context required.');
    const tid = user.tenantId;
    const data = await this.tenantRunner.withTenantCatalog(tid, (m) => {
      const invoicesRepo = m.getRepository(Invoice);
      if (user.role === UserRole.CUSTOMER) {
        return invoicesRepo
          .createQueryBuilder('i')
          .innerJoin(Order, 'o', 'o.id = i.order_id AND o.deleted_at IS NULL')
          .where('i.tenant_id = :tenantId', { tenantId: tid })
          .andWhere('o.user_id = :userId', { userId: user.sub })
          .orderBy('i.created_at', 'DESC')
          .getMany();
      }
      return invoicesRepo.find({
        where: { tenantId: tid },
        order: { createdAt: 'DESC' },
      });
    });
    return { success: true, data, meta: {}, message: '' };
  }

  async download(user: JwtUserPayload, id: string) {
    const tenantId =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_SUPPORT
        ? await this.findTenantIdForInvoice(id)
        : user.tenantId;
    if (!tenantId) throw new BadRequestException('Invoice not found.');
    if (user.tenantId && user.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const invoice = await m.getRepository(Invoice).findOne({ where: { id } });
      if (!invoice) throw new BadRequestException('Invoice not found.');
      if (user.role === UserRole.CUSTOMER) {
        const order = await m
          .getRepository(Order)
          .findOne({ where: { id: invoice.orderId, deletedAt: IsNull() } });
        if (!order || order.userId !== user.sub) {
          throw new ForbiddenException('Not your invoice.');
        }
      }
      return {
        success: true,
        data: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          url: await this.ensureInvoiceDocument(m, invoice),
          expiresInSeconds: 300,
        },
        meta: {},
        message: '',
      };
    });
  }

  private async ensureInvoiceDocument(
    m: import('typeorm').EntityManager,
    invoice: Invoice,
  ): Promise<string> {
    if (!invoice.documentReference) {
      const lines = await m
        .getRepository(InvoiceItem)
        .find({ where: { invoiceId: invoice.id } });
      const order = await m
        .getRepository(Order)
        .findOne({ where: { id: invoice.orderId } });
      const discountLine =
        Number(order?.discountAmount ?? 0) > 0
          ? [
              `Coupon ${order?.couponCode ?? ''}: -INR ${Number(order?.discountAmount).toFixed(2)}`,
            ]
          : [];
      const content = this.simplePdf([
        `Invoice: ${invoice.invoiceNumber}`,
        `Date: ${invoice.invoiceDate}`,
        ...lines.map(
          (line) =>
            `${line.variantSku ?? line.productId} x ${line.quantity}: INR ${Number(line.totalPrice).toFixed(2)}`,
        ),
        ...discountLine,
        `Total: INR ${Number(invoice.totalAmount).toFixed(2)}`,
      ]);
      const stored = await this.privateDocuments.storeBuffer({
        tenantId: invoice.tenantId,
        category: 'invoices',
        ownerId: invoice.id,
        extension: '.pdf',
        contentType: 'application/pdf',
        originalName: `${invoice.invoiceNumber.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`,
        buffer: content,
      });
      invoice.documentReference = stored.reference;
      await m.getRepository(Invoice).save(invoice);
    }
    const url = this.privateDocuments.sign(invoice.documentReference);
    if (!url) throw new BadRequestException('Invoice document is unavailable.');
    return url;
  }

  private simplePdf(lines: string[]): Buffer {
    const escaped = lines
      .map((line) =>
        line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'),
      )
      .join('\\n');
    const stream = `BT /F1 11 Tf 50 780 Td (${escaped}) Tj ET`;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
      `4 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    ];
    let body = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(body));
      body += `${object}\n`;
    }
    const xref = Buffer.byteLength(body);
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index <= objects.length; index += 1) {
      body += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }
    body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(body, 'utf8');
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

  private async findTenantIdForInvoice(
    invoiceId: string,
  ): Promise<string | null> {
    const tenants = await this.dataSource.getRepository(Tenant).find({
      select: ['id', 'tenantSchemaProvisioned'],
    });
    for (const te of tenants) {
      if (!te.tenantSchemaProvisioned) continue;
      try {
        const n = await this.tenantRunner.withTenantCatalog(te.id, async (m) =>
          m.getRepository(Invoice).count({ where: { id: invoiceId } }),
        );
        if (n > 0) return te.id;
      } catch {
        /* skip */
      }
    }
    return null;
  }

  /**
   * Latest invoice (by `invoices.created_at`) for any order owned by the storefront user
   * linked to `customerId`.
   */
  async findLatestInvoiceForCustomer(
    tenantId: string,
    customerId: string,
  ): Promise<Invoice | null> {
    const user = await this.usersRepo.findOne({
      where: { tenantId, customerId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!user) return null;
    return this.tenantRunner.withTenantCatalog(tenantId, (m) =>
      m
        .createQueryBuilder(Invoice, 'i')
        .innerJoin(Order, 'o', 'o.id = i.order_id AND o.deleted_at IS NULL')
        .where('o.user_id = :userId', { userId: user.id })
        .andWhere('o.tenant_id = :tenantId', { tenantId })
        .orderBy('i.created_at', 'DESC')
        .getOne(),
    );
  }

  private async getOrCreateInvoiceSettings(
    tenantId: string,
  ): Promise<InvoiceSetting> {
    let settings = await this.invoiceSettingsRepo.findOne({
      where: { tenantId },
    });
    if (!settings) {
      settings = await this.invoiceSettingsRepo.save(
        this.invoiceSettingsRepo.create({
          tenantId,
          invoicePrefix: 'INV',
          invoiceStartNumber: 0,
          invoiceFormat: 'PREFIX/FY/COUNTER',
          counterPadding: 4,
          taxEnabled: true,
          currency: 'INR',
        }),
      );
    }
    return settings;
  }
}
