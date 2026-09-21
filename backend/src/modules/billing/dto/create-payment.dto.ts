import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

enum BillingPaymentMethod {
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  RAZORPAY = 'RAZORPAY',
}

export class CreatePaymentDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsUUID()
  subscriptionId: string;

  @IsEnum(BillingPaymentMethod)
  paymentMethod: BillingPaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionReference?: string;
}
