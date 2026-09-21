import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertTranslationDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  languageCode?: string;

  @IsString()
  @MaxLength(255)
  translationKey: string;

  @IsString()
  translationValue: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;
}
