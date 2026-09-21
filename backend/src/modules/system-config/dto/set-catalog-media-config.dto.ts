import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SetCatalogMediaConfigDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsInt()
  @Min(1)
  @Max(50)
  maxImagesPerProduct: number;

  @IsInt()
  @Min(1)
  @Max(20)
  maxImageSizeMb: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  allowedFormats: string[];
}
