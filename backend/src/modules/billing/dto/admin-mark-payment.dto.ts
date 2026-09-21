import { IsEnum, IsUUID } from 'class-validator';

enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class AdminMarkPaymentDto {
  @IsUUID()
  paymentId: string;

  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;
}
