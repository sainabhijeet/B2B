import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumberString, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { ORDER_PAYMENT_MODES, OrderPaymentModeInput } from '../order-payment-flow';

export class UploadPaymentProofDto {
  @ApiPropertyOptional({ description: 'Legacy/reference field. UTR should be sent in `utrNumber` when available.' })
  @IsOptional()
  @IsString()
  @Length(6, 35)
  @Matches(/^[A-Za-z0-9]+$/)
  paymentReference?: string;

  @ApiPropertyOptional({ description: 'Legacy proof URL field. Multipart clients can use `/payment-proof/upload`.' })
  @IsOptional()
  @IsString()
  paymentScreenshotUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentNote?: string;

  @ApiPropertyOptional({ enum: ORDER_PAYMENT_MODES })
  @IsOptional()
  @IsIn(ORDER_PAYMENT_MODES)
  paymentMode?: OrderPaymentModeInput;

  @ApiPropertyOptional({ description: 'Bank/UPI transaction reference number.' })
  @IsOptional()
  @IsString()
  @Length(6, 35)
  @Matches(/^[A-Za-z0-9]+$/)
  utrNumber?: string;

  @ApiPropertyOptional({ description: 'Amount paid. It must exactly match the order total.' })
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @ApiPropertyOptional({ description: 'Client-generated idempotency key for retry-safe uploads.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  idempotencyKey?: string;
}
