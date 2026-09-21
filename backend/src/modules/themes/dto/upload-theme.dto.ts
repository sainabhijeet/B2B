import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UploadThemeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  themeName!: string;

  /** Industry / family key, e.g. `jewellery`, `electronics`. */
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  themeType!: string;

  @IsIn(['web', 'mobile'])
  platform!: 'web' | 'mobile';

  @IsOptional()
  @IsString()
  @MaxLength(32)
  version?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must be lowercase letters, numbers, single hyphens (e.g. modern-web)',
  })
  slug?: string;

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

  /** Optional newline/comma separated preview image URLs. */
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  previewImagesText?: string;
}
