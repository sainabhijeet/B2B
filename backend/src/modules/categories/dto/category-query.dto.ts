import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsIn(['all', 'global', 'tenant'])
  scope?: 'all' | 'global' | 'tenant';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeGlobal?: boolean;
}
