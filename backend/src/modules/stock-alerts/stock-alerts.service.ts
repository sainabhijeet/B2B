import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Inventory } from '../../common/entities/inventory.entity';
import { Notification } from '../../common/entities/notification.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { Product } from '../../common/entities/product.entity';
import { StockAlertSubscription } from '../../common/entities/stock-alert-subscription.entity';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { CreateStockAlertDto } from './dto/create-stock-alert.dto';

export type RestockedProduct = {
  tenantId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  productSlug: string;
  availableStock: number;
  minimumOrderQuantity: number;
};

@Injectable()
export class StockAlertsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(StockAlertSubscription)
    private readonly alertsRepo: Repository<StockAlertSubscription>,
    private readonly tenantRunner: TenantSchemaRunner,
  ) {}

  async listActive(user: JwtUserPayload) {
    const tenantId = this.requireCustomerTenant(user);
    const rows = await this.alertsRepo.find({
      where: { tenantId, userId: user.sub, status: 'ACTIVE' },
      order: { createdAt: 'DESC' },
    });
    return { success: true, data: rows, meta: {}, message: '' };
  }

  async subscribe(user: JwtUserPayload, dto: CreateStockAlertDto) {
    const tenantId = this.requireCustomerTenant(user);
    const variantId = dto.variantId ?? null;
    const snapshot = await this.tenantRunner.withTenantCatalog(
      tenantId,
      async (manager) => {
        const product = await manager.getRepository(Product).findOne({
          where: {
            id: dto.productId,
            tenantId,
            status: 'active',
            deletedAt: IsNull(),
          },
        });
        if (!product) throw new NotFoundException('Product not found.');

        const variant = variantId
          ? await manager.getRepository(ProductVariant).findOne({
              where: {
                id: variantId,
                productId: product.id,
                status: 'active',
                deletedAt: IsNull(),
              },
            })
          : null;
        if (variantId && !variant) {
          throw new NotFoundException('Product variant not found.');
        }

        const inventory = await manager.getRepository(Inventory).findOne({
          where: {
            productId: product.id,
            variantId: variantId ? variantId : IsNull(),
          },
        });
        const availableStock = Math.max(
          0,
          (inventory?.stockQuantity ?? 0) - (inventory?.reservedStock ?? 0),
        );
        const minimumOrderQuantity = variant?.moq ?? 1;
        if (availableStock >= minimumOrderQuantity) {
          throw new BadRequestException(
            'Product is already available for its minimum order quantity.',
          );
        }

        return {
          productName: product.name,
          variantName: variant?.variantSku ?? null,
        };
      },
    );

    const existing = await this.alertsRepo
      .createQueryBuilder('alert')
      .where('alert.tenant_id = :tenantId', { tenantId })
      .andWhere('alert.user_id = :userId', { userId: user.sub })
      .andWhere('alert.product_id = :productId', {
        productId: dto.productId,
      })
      .andWhere(
        variantId
          ? 'alert.variant_id = :variantId'
          : 'alert.variant_id IS NULL',
        variantId ? { variantId } : {},
      )
      .andWhere("alert.status = 'ACTIVE'")
      .getOne();
    if (existing) {
      return {
        success: true,
        data: existing,
        meta: {},
        message: 'Stock alert is already active.',
      };
    }

    const saved = await this.alertsRepo.save(
      this.alertsRepo.create({
        tenantId,
        userId: user.sub,
        productId: dto.productId,
        variantId,
        productName: snapshot.productName,
        variantName: snapshot.variantName,
        status: 'ACTIVE',
        notifiedAt: null,
        cancelledAt: null,
      }),
    );
    return {
      success: true,
      data: saved,
      meta: {},
      message: 'We will notify you when this product is available.',
    };
  }

  async cancel(user: JwtUserPayload, id: string) {
    const tenantId = this.requireCustomerTenant(user);
    const row = await this.alertsRepo.findOne({
      where: { id, tenantId, userId: user.sub, status: 'ACTIVE' },
    });
    if (!row) throw new NotFoundException('Active stock alert not found.');
    row.status = 'CANCELLED';
    row.cancelledAt = new Date();
    const saved = await this.alertsRepo.save(row);
    return {
      success: true,
      data: saved,
      meta: {},
      message: 'Stock alert cancelled.',
    };
  }

  async notifyRestocked(input: RestockedProduct): Promise<number> {
    if (input.availableStock < input.minimumOrderQuantity) return 0;

    return this.dataSource.transaction(async (manager) => {
      const alertRepo = manager.getRepository(StockAlertSubscription);
      const query = alertRepo
        .createQueryBuilder('alert')
        .setLock('pessimistic_write')
        .where('alert.tenant_id = :tenantId', { tenantId: input.tenantId })
        .andWhere('alert.product_id = :productId', {
          productId: input.productId,
        })
        .andWhere(
          input.variantId
            ? 'alert.variant_id = :variantId'
            : 'alert.variant_id IS NULL',
          input.variantId ? { variantId: input.variantId } : {},
        )
        .andWhere("alert.status = 'ACTIVE'");
      const alerts = await query.getMany();
      if (alerts.length === 0) return 0;

      const now = new Date();
      const displayName = input.variantName
        ? `${input.productName} (${input.variantName})`
        : input.productName;
      const notificationRepo = manager.getRepository(Notification);
      await notificationRepo.save(
        alerts.map((alert) =>
          notificationRepo.create({
            tenantId: input.tenantId,
            userId: alert.userId,
            type: 'BACK_IN_STOCK',
            title: 'Product is back in stock',
            message: `${displayName} is available again. Open the product to place your order.`,
            status: 'SENT',
            entityType: 'PRODUCT',
            entityId: input.productId,
            actionUrl: `/products/${input.productSlug}`,
            metadataJson: {
              productId: input.productId,
              variantId: input.variantId,
              availableStock: input.availableStock,
              minimumOrderQuantity: input.minimumOrderQuantity,
              channel: 'IN_APP',
            },
            readAt: null,
          }),
        ),
      );
      for (const alert of alerts) {
        alert.status = 'NOTIFIED';
        alert.notifiedAt = now;
      }
      await alertRepo.save(alerts);
      return alerts.length;
    });
  }

  private requireCustomerTenant(user: JwtUserPayload): string {
    if (!user.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }
    return user.tenantId;
  }
}
