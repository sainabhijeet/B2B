import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpsertInventoryDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsInt()
  @Min(0)
  stockQuantity: number;

  @IsInt()
  @Min(0)
  lowStockThreshold: number;
}
