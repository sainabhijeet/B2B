import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class VerifyRazorpayPaymentDto {
  @IsUUID()
  subscriptionId: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsString()
  @MaxLength(64)
  razorpayOrderId: string;

  @IsString()
  @MaxLength(64)
  razorpayPaymentId: string;

  @IsString()
  @MaxLength(512)
  razorpaySignature: string;
}
