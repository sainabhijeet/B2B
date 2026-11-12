import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export enum MediaOwnershipTypeFilter {
  PLATFORM = 'PLATFORM',
  TENANT = 'TENANT',
}

export enum MediaStatusFilter {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

export enum MediaFileTypeFilter {
  IMAGE = 'image',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  VIDEO = 'video',
  OTHER = 'other',
}

export enum MediaSortOption {
  CREATED_AT_DESC = 'created_at:desc',
  CREATED_AT_ASC = 'created_at:asc',
  NAME_ASC = 'name:asc',
  NAME_DESC = 'name:desc',
  SIZE_ASC = 'size:asc',
  SIZE_DESC = 'size:desc',
}

const trimOptional = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListMediaDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
  category?: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9 _-]*$/)
  module?: string;

  @ApiPropertyOptional({ enum: MediaOwnershipTypeFilter })
  @IsOptional()
  @IsEnum(MediaOwnershipTypeFilter)
  ownershipType?: MediaOwnershipTypeFilter;

  @ApiPropertyOptional({
    enum: MediaStatusFilter,
    default: MediaStatusFilter.ACTIVE,
  })
  @IsOptional()
  @IsEnum(MediaStatusFilter)
  status?: MediaStatusFilter;

  @ApiPropertyOptional({ enum: MediaFileTypeFilter })
  @IsOptional()
  @IsEnum(MediaFileTypeFilter)
  fileType?: MediaFileTypeFilter;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(255)
  mimeType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Only media without a folder.' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  unfiled?: boolean;

  @ApiPropertyOptional({
    enum: MediaSortOption,
    default: MediaSortOption.CREATED_AT_DESC,
  })
  @IsOptional()
  @IsEnum(MediaSortOption)
  sort?: MediaSortOption;
}
