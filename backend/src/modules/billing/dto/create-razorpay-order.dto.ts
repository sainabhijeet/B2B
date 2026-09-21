import { IsOptional, IsUUID } from 'class-validator';

export class CreateRazorpayOrderDto {
  @IsUUID()
  subscriptionId: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
