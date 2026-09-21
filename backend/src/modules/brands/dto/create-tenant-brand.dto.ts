import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateTenantBrandDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
