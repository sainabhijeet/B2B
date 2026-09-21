import { IsEnum, IsUUID } from 'class-validator';

enum PayoutStatus {
  APPROVED = 'APPROVED',
  PAID = 'PAID',
}

export class AdminPayoutDto {
  @IsUUID()
  commissionId: string;

  @IsEnum(PayoutStatus)
  status: PayoutStatus;
}
