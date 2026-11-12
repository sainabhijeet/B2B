import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaFileTypeFilter } from './list-media.dto';

export class MediaProviderSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiPropertyOptional()
  type?: string | null;
}

export class MediaResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  objectKey!: string;

  @ApiPropertyOptional()
  filename?: string | null;

  @ApiPropertyOptional()
  originalName?: string | null;

  @ApiPropertyOptional()
  mimeType?: string | null;

  @ApiProperty({ type: String })
  sizeBytes!: string;

  @ApiProperty({ enum: MediaFileTypeFilter })
  fileType!: MediaFileTypeFilter;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  module!: string;

  @ApiProperty()
  ownershipType!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  tenantId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  providerId?: string | null;

  @ApiPropertyOptional({ type: MediaProviderSummaryDto })
  provider?: MediaProviderSummaryDto | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  folderId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  folderName?: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  scanRequired!: boolean;

  @ApiProperty()
  scanStatus!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  createdAt?: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  updatedAt?: string | null;
}

export class MediaListResponseDto {
  @ApiProperty({ type: [MediaResponseDto] })
  items!: MediaResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty()
  hasPreviousPage!: boolean;
}
