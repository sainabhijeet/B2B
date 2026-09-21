import { IsOptional, IsUUID } from 'class-validator';

export class SubscribePlanDto {
  @IsUUID()
  planId: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
