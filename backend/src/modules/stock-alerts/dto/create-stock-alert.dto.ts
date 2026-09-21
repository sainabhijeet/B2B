import { IsOptional, IsUUID } from 'class-validator';

export class CreateStockAlertDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;
}
