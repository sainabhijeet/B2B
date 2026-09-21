import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductImageDto {
  @IsOptional()
  @IsString()
  variantId?: string;

  @IsString()
  imageUrl: string;

  @IsBoolean()
  isThumbnail: boolean;

  @IsInt()
  position: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  imageSizeMb?: number;
}
