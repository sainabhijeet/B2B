import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Request body for POST /logo/generate (snake_case for public API contract). */
export class GenerateLogoDto {
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
  @MinLength(1)
  @MaxLength(64)
  style?: string;

  /** @deprecated Prefer primary_hex + secondary_hex when set. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  color?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  primary_hex?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  secondary_hex?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;
}
