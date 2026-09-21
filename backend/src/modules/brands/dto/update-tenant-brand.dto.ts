import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateTenantBrandDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  slug?: string;

  /** Send empty string to clear the logo URL. */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  logoUrl?: string;

  /** Send empty string to clear the description. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
