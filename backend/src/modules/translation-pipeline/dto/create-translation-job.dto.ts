import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export class CreateTranslationJobDto {
  @IsUUID() themeId: string;
  @IsOptional() @IsString() @MaxLength(16) sourceLanguage?: string;
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  targetLanguages: string[];
  @IsOptional() @IsString() @MaxLength(64) themeVersion?: string;
}
