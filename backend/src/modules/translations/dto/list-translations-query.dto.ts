import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListTranslationsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  languageCode?: string;
}
