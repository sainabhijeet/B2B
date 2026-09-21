import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderSource } from '../../../common/enums/order-source.enum';
import { ORDER_PAYMENT_MODES, OrderPaymentModeInput } from '../order-payment-flow';

export type OrderPaymentModeDto = OrderPaymentModeInput;

export class BuyNowOrderItemDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Must match the authenticated user’s active cart id when sent.' })
  @IsOptional()
  @IsUUID()
  cartId?: string;

  @ApiPropertyOptional({
    type: BuyNowOrderItemDto,
    description:
      'An isolated Buy Now line. It is priced server-side and never added to or removed from the active cart.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BuyNowOrderItemDto)
  buyNow?: BuyNowOrderItemDto;

  @ApiPropertyOptional({ description: 'Selected `customer_addresses` row for this retailer.' })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({
    enum: ORDER_PAYMENT_MODES,
    default: 'CREDIT',
    description: '`PREPAID` is accepted for backward compatibility and is stored as `UPI_QR`.',
  })
  @IsOptional()
  @IsIn(ORDER_PAYMENT_MODES)
  paymentMode?: OrderPaymentModeDto;

  @ApiPropertyOptional({ description: 'Active tenant coupon code.' })
  @IsOptional()
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @Matches(/^[A-Z0-9_-]{3,40}$/)
  couponCode?: string;

  /** Distributor staff only: defaults to STOREFRONT for retailer checkout. */
  @ApiPropertyOptional({ enum: OrderSource })
  @IsOptional()
  @IsIn([OrderSource.STOREFRONT, OrderSource.MANUAL])
  orderSource?: OrderSource;
}
