import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CouponRedemption } from '../../common/entities/coupon-redemption.entity';
import { TenantCoupon } from '../../common/entities/tenant-coupon.entity';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

export type AppliedCoupon = {
  coupon: TenantCoupon;
  discountAmount: string;
};

@Injectable()
export class CouponsService {
  constructor(private readonly tenantRunner: TenantSchemaRunner) {}

  async list(user: JwtUserPayload) {
    const tenantId = this.tenantId(user);
    const data = await this.tenantRunner.withTenantCatalog(
      tenantId,
      (manager) =>
        manager.getRepository(TenantCoupon).find({
          where: { tenantId },
          order: { createdAt: 'DESC' },
          take: 500,
        }),
    );
    return this.envelope(data);
  }

  async create(user: JwtUserPayload, dto: CreateCouponDto) {
    const tenantId = this.tenantId(user);
    this.assertValues(
      dto.discountType,
      dto.discountValue,
      dto.maximumDiscountAmount,
      dto.startsAt,
      dto.endsAt,
    );
    const data = await this.tenantRunner.withTenantCatalog(
      tenantId,
      async (manager) => {
        const repo = manager.getRepository(TenantCoupon);
        if (await repo.exist({ where: { tenantId, code: dto.code } })) {
          throw new ConflictException('Coupon code already exists.');
        }
        return repo.save(
          repo.create({
            tenantId,
            code: dto.code,
            name: dto.name.trim(),
            discountType: dto.discountType,
            discountValue: this.money(dto.discountValue),
            minimumOrderAmount: this.money(dto.minimumOrderAmount ?? 0),
            maximumDiscountAmount:
              dto.maximumDiscountAmount == null
                ? null
                : this.money(dto.maximumDiscountAmount),
            startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
            endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
            usageLimit: dto.usageLimit ?? null,
            perCustomerLimit: dto.perCustomerLimit ?? 1,
            usedCount: 0,
            active: dto.active ?? true,
          }),
        );
      },
    );
    return this.envelope(data);
  }

  async update(user: JwtUserPayload, id: string, dto: UpdateCouponDto) {
    const tenantId = this.tenantId(user);
    const data = await this.tenantRunner.withTenantCatalog(
      tenantId,
      async (manager) => {
        const repo = manager.getRepository(TenantCoupon);
        const row = await repo.findOne({ where: { id, tenantId } });
        if (!row) throw new NotFoundException('Coupon not found.');
        const discountType = dto.discountType ?? row.discountType;
        const discountValue = dto.discountValue ?? Number(row.discountValue);
        const maximumDiscount =
          dto.maximumDiscountAmount === undefined
            ? row.maximumDiscountAmount == null
              ? null
              : Number(row.maximumDiscountAmount)
            : dto.maximumDiscountAmount;
        const startsAt =
          dto.startsAt === undefined
            ? row.startsAt?.toISOString()
            : dto.startsAt;
        const endsAt =
          dto.endsAt === undefined ? row.endsAt?.toISOString() : dto.endsAt;
        this.assertValues(
          discountType,
          discountValue,
          maximumDiscount,
          startsAt,
          endsAt,
        );
        if (dto.name !== undefined) row.name = dto.name.trim();
        row.discountType = discountType;
        row.discountValue = this.money(discountValue);
        if (dto.minimumOrderAmount !== undefined)
          row.minimumOrderAmount = this.money(dto.minimumOrderAmount);
        if (dto.maximumDiscountAmount !== undefined) {
          row.maximumDiscountAmount =
            dto.maximumDiscountAmount == null
              ? null
              : this.money(dto.maximumDiscountAmount);
        }
        if (dto.startsAt !== undefined)
          row.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
        if (dto.endsAt !== undefined)
          row.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
        if (dto.usageLimit !== undefined) row.usageLimit = dto.usageLimit;
        if (dto.perCustomerLimit !== undefined)
          row.perCustomerLimit = dto.perCustomerLimit;
        if (dto.active !== undefined) row.active = dto.active;
        return repo.save(row);
      },
    );
    return this.envelope(data);
  }

  async remove(user: JwtUserPayload, id: string) {
    const tenantId = this.tenantId(user);
    const data = await this.tenantRunner.withTenantCatalog(
      tenantId,
      async (manager) => {
        const repo = manager.getRepository(TenantCoupon);
        const row = await repo.findOne({ where: { id, tenantId } });
        if (!row) throw new NotFoundException('Coupon not found.');
        if (row.usedCount > 0) {
          row.active = false;
          await repo.save(row);
          return { id, archived: true };
        }
        await repo.remove(row);
        return { id, archived: false };
      },
    );
    return this.envelope(data);
  }

  async applyForOrder(
    manager: EntityManager,
    input: {
      tenantId: string;
      code: string;
      grossTotal: number;
      customerId?: string | null;
    },
  ): Promise<AppliedCoupon> {
    const code = input.code.trim().toUpperCase();
    const coupon = await manager.getRepository(TenantCoupon).findOne({
      where: { tenantId: input.tenantId, code },
      lock: { mode: 'pessimistic_write' },
    });
    if (!coupon || !coupon.active)
      throw new BadRequestException('Coupon is invalid or inactive.');
    const now = Date.now();
    if (coupon.startsAt && coupon.startsAt.getTime() > now)
      throw new BadRequestException('Coupon is not active yet.');
    if (coupon.endsAt && coupon.endsAt.getTime() < now)
      throw new BadRequestException('Coupon has expired.');
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached.');
    }
    if (input.grossTotal < Number(coupon.minimumOrderAmount)) {
      throw new BadRequestException(
        `Coupon requires a minimum order of INR ${coupon.minimumOrderAmount}.`,
      );
    }
    if (input.customerId) {
      const customerUses = await manager.getRepository(CouponRedemption).count({
        where: { couponId: coupon.id, customerId: input.customerId },
      });
      if (customerUses >= coupon.perCustomerLimit) {
        throw new BadRequestException(
          'Coupon usage limit for this customer has been reached.',
        );
      }
    }
    let discount =
      coupon.discountType === 'PERCENTAGE'
        ? input.grossTotal * (Number(coupon.discountValue) / 100)
        : Number(coupon.discountValue);
    if (coupon.maximumDiscountAmount != null) {
      discount = Math.min(discount, Number(coupon.maximumDiscountAmount));
    }
    discount = Math.min(input.grossTotal, Math.max(0, discount));
    if (discount <= 0)
      throw new BadRequestException(
        'Coupon does not provide a valid discount.',
      );
    return { coupon, discountAmount: this.money(discount) };
  }

  async recordRedemption(
    manager: EntityManager,
    input: AppliedCoupon & {
      tenantId: string;
      orderId: string;
      customerId?: string | null;
    },
  ): Promise<void> {
    input.coupon.usedCount += 1;
    await manager.getRepository(TenantCoupon).save(input.coupon);
    await manager.getRepository(CouponRedemption).save(
      manager.getRepository(CouponRedemption).create({
        tenantId: input.tenantId,
        couponId: input.coupon.id,
        orderId: input.orderId,
        customerId: input.customerId ?? null,
        discountAmount: input.discountAmount,
      }),
    );
  }

  async reverseRedemptionForOrder(
    manager: EntityManager,
    orderId: string,
  ): Promise<void> {
    const redemptions = manager.getRepository(CouponRedemption);
    const redemption = await redemptions.findOne({
      where: { orderId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!redemption) return;

    const coupons = manager.getRepository(TenantCoupon);
    const coupon = await coupons.findOne({
      where: { id: redemption.couponId },
      lock: { mode: 'pessimistic_write' },
    });
    if (coupon) {
      coupon.usedCount = Math.max(0, coupon.usedCount - 1);
      await coupons.save(coupon);
    }
    await redemptions.delete({ id: redemption.id });
  }

  private assertValues(
    type: 'PERCENTAGE' | 'FIXED',
    value: number,
    maximum: number | null | undefined,
    startsAt: string | null | undefined,
    endsAt: string | null | undefined,
  ) {
    if (type === 'PERCENTAGE' && value > 100)
      throw new BadRequestException('Percentage discount cannot exceed 100.');
    if (type === 'FIXED' && maximum != null)
      throw new BadRequestException(
        'Maximum discount only applies to percentage coupons.',
      );
    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
      throw new BadRequestException(
        'Coupon end date must be after its start date.',
      );
    }
  }

  private tenantId(user: JwtUserPayload): string {
    if (!user.tenantId)
      throw new BadRequestException('Tenant context required.');
    return user.tenantId;
  }

  private money(value: number): string {
    return Number(value).toFixed(2);
  }

  private envelope<T>(data: T) {
    return { success: true, data, meta: {}, message: '' };
  }
}
