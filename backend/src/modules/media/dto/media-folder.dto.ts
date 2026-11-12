import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

const trimOptional = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateMediaFolderDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @Transform(trimOptional)
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

export class UpdateMediaFolderDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

export class MoveMediaFolderDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  folderId?: string | null;
}
