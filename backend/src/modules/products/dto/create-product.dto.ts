import { IsArray, IsNumberString, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  @Length(2, 255)
  name: string;

  @IsString()
  @Length(2, 255)
  slug: string;

  @IsString()
  @Length(2, 128)
  sku: string;

  @IsString()
  description: string;

  @IsString()
  categoryId: string;

  @IsNumberString()
  price: string;

  @IsNumberString()
  mrp: string;

  @IsNumberString()
  taxRate: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsUUID()
  brandMasterId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  metaKeywords?: string;

  @IsOptional()
  @IsNumberString()
  costPrice?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
