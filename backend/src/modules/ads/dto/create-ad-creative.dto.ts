import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateAdCreativeDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUrl()
  imageUrl: string;

  @IsUrl()
  targetUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  cta?: string;
}
