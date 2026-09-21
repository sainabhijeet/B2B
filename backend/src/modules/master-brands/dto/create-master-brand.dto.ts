import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateMasterBrandDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  /** If omitted or empty, derived from `name`. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  logoUrl?: string | null;

  /** Omit or null for no industry. */
  @IsOptional()
  @IsUUID()
  industryId?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive'])
  status?: string;
}
