import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateThemeComboDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name!: string;

  @IsUUID()
  webThemeId!: string;

  @IsUUID()
  mobileThemeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  previewImage?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}
