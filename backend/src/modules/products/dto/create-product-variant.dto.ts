import { IsInt, IsNumber, IsNumberString, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  variantSku: string;

  @IsNumberString()
  price: string;

  @IsNumberString()
  mrp: string;

  @IsNumber()
  stockQuantity: number;

  @IsObject()
  attributesJson: Record<string, unknown>;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  moq?: number;

  @IsOptional()
  @IsNumberString()
  gstRate?: string;
}
