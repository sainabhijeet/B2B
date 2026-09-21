import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListTranslationJobsDto {
  @IsOptional() @IsString() @MaxLength(32) status?: string;
  @IsOptional() @IsString() @MaxLength(64) themeId?: string;
}
