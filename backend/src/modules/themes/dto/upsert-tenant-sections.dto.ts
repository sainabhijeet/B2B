import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class TenantSectionItemDto {
  @IsString()
  @MaxLength(128)
  sectionKey: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderIndex?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpsertTenantSectionsDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsString()
  @MaxLength(64)
  page: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TenantSectionItemDto)
  sections: TenantSectionItemDto[];
}
