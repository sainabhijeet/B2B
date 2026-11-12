import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MediaFolderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parentId!: string | null;

  @ApiProperty()
  ownershipType!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  tenantId!: string | null;

  @ApiProperty()
  mediaCount!: number;

  @ApiPropertyOptional({ type: [MediaFolderResponseDto] })
  children?: MediaFolderResponseDto[];

  @ApiPropertyOptional({ format: 'date-time' })
  createdAt!: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  updatedAt!: string | null;
}
