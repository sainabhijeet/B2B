import { IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class SuggestTaglinesDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  business_name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  industry: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  style?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  primary_hex?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  secondary_hex?: string;
}
