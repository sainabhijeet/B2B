import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateThemeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  themeName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  themeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  version?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  demoHost?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  previewImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  previewImagesText?: string;
}
