import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => String(value ?? '').trim();

export class UploadAdminMediaDto {
  @Transform(trim)
  @IsString()
  @Length(1, 128)
  folderId: string;

  @Transform(trim)
  @IsString()
  @Length(1, 64)
  module: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  tags?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
