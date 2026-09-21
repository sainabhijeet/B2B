import { IsString, Matches, MaxLength } from 'class-validator';

export class VerifyOrderRazorpayPaymentDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^order_[A-Za-z0-9]+$/)
  razorpayOrderId: string;

  @IsString()
  @MaxLength(64)
  @Matches(/^pay_[A-Za-z0-9]+$/)
  razorpayPaymentId: string;

  @IsString()
  @Matches(/^[a-fA-F0-9]{64}$/)
  razorpaySignature: string;
}
