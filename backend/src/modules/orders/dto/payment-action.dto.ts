import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class PaymentActionDto {
  @IsString()
  @IsIn(['approve', 'verify', 'reject'])
  action: 'approve' | 'verify' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
