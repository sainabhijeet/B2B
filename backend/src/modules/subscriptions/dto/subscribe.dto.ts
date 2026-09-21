import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class SubscribeDto {
  @IsUUID()
  tenantId: string;

  @IsIn(['FREE', 'BASIC', 'PREMIUM'])
  planName: 'FREE' | 'BASIC' | 'PREMIUM';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
