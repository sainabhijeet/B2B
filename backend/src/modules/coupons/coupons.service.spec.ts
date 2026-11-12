import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CouponRedemption } from '../../common/entities/coupon-redemption.entity';
import { TenantCoupon } from '../../common/entities/tenant-coupon.entity';
import { CouponsService } from './coupons.service';

type RepoMock<T> = {
  findOne: jest.Mock;
  count: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  delete: jest.Mock;
};

const tenantId = 'tenant-1';
const customerId = 'customer-1';

function coupon(overrides: Partial<TenantCoupon> = {}): TenantCoupon {
  return {
    id: 'coupon-1',
    tenantId,
    code: 'SAVE10',
    name: 'Save 10%',
    discountType: 'PERCENTAGE',
    discountValue: '10.00',
    minimumOrderAmount: '0.00',
    maximumDiscountAmount: null,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    perCustomerLimit: 1,
    usedCount: 0,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as TenantCoupon;
}

function managerWith(
  couponRepo: RepoMock<TenantCoupon>,
  redemptionRepo: RepoMock<CouponRedemption>,
) {
  return {
    getRepository: jest.fn((entity) => {
      if (entity === TenantCoupon) return couponRepo;
      if (entity === CouponRedemption) return redemptionRepo;
      throw new Error(`Unexpected repository: ${String(entity)}`);
    }),
  } as unknown as EntityManager;
}

function repoMock<T>(): RepoMock<T> {
  return {
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(async (value) => value),
    create: jest.fn((value) => value),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
}

describe('CouponsService', () => {
  let service: CouponsService;
  let coupons: RepoMock<TenantCoupon>;
  let redemptions: RepoMock<CouponRedemption>;
  let manager: EntityManager;

  beforeEach(() => {
    service = new CouponsService({} as never);
    coupons = repoMock<TenantCoupon>();
    redemptions = repoMock<CouponRedemption>();
    manager = managerWith(coupons, redemptions);
  });

  it('applies a valid percentage coupon with a maximum discount cap', async () => {
    coupons.findOne.mockResolvedValue(
      coupon({ discountValue: '25.00', maximumDiscountAmount: '40.00' }),
    );
    redemptions.count.mockResolvedValue(0);

    await expect(
      service.applyForOrder(manager, {
        tenantId,
        code: ' save10 ',
        grossTotal: 500,
        customerId,
      }),
    ).resolves.toMatchObject({ discountAmount: '40.00' });

    expect(coupons.findOne).toHaveBeenCalledWith({
      where: { tenantId, code: 'SAVE10' },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('rejects expired, inactive, over-limit, and below-minimum coupons', async () => {
    coupons.findOne.mockResolvedValueOnce(coupon({ active: false }));
    await expect(
      service.applyForOrder(manager, {
        tenantId,
        code: 'SAVE10',
        grossTotal: 100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    coupons.findOne.mockResolvedValueOnce(
      coupon({ endsAt: new Date('2020-01-01T00:00:00.000Z') }),
    );
    await expect(
      service.applyForOrder(manager, {
        tenantId,
        code: 'SAVE10',
        grossTotal: 100,
      }),
    ).rejects.toThrow('Coupon has expired.');

    coupons.findOne.mockResolvedValueOnce(
      coupon({ usageLimit: 5, usedCount: 5 }),
    );
    await expect(
      service.applyForOrder(manager, {
        tenantId,
        code: 'SAVE10',
        grossTotal: 100,
      }),
    ).rejects.toThrow('Coupon usage limit has been reached.');

    coupons.findOne.mockResolvedValueOnce(
      coupon({ minimumOrderAmount: '250.00' }),
    );
    await expect(
      service.applyForOrder(manager, {
        tenantId,
        code: 'SAVE10',
        grossTotal: 100,
      }),
    ).rejects.toThrow('Coupon requires a minimum order');
  });

  it('rejects per-customer limit exhaustion', async () => {
    coupons.findOne.mockResolvedValue(coupon({ perCustomerLimit: 1 }));
    redemptions.count.mockResolvedValue(1);

    await expect(
      service.applyForOrder(manager, {
        tenantId,
        code: 'SAVE10',
        grossTotal: 100,
        customerId,
      }),
    ).rejects.toThrow('Coupon usage limit for this customer has been reached.');
  });

  it('records a redemption and increments usage exactly once', async () => {
    const row = coupon({ usedCount: 0 });

    await service.recordRedemption(manager, {
      coupon: row,
      discountAmount: '25.00',
      tenantId,
      orderId: 'order-1',
      customerId,
    });

    expect(row.usedCount).toBe(1);
    expect(coupons.save).toHaveBeenCalledWith(row);
    expect(redemptions.save).toHaveBeenCalledWith({
      tenantId,
      couponId: row.id,
      orderId: 'order-1',
      customerId,
      discountAmount: '25.00',
    });
  });

  it('reverses redemption on cancellation without dropping usage below zero', async () => {
    redemptions.findOne.mockResolvedValue({
      id: 'redemption-1',
      couponId: 'coupon-1',
      orderId: 'order-1',
    });
    const row = coupon({ usedCount: 0 });
    coupons.findOne.mockResolvedValue(row);

    await service.reverseRedemptionForOrder(manager, 'order-1');

    expect(row.usedCount).toBe(0);
    expect(coupons.save).toHaveBeenCalledWith(row);
    expect(redemptions.delete).toHaveBeenCalledWith({ id: 'redemption-1' });
  });
});
