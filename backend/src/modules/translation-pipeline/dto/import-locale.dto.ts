import { IsObject, IsString, MaxLength } from 'class-validator';

export class ImportLocaleDto {
  @IsString() @MaxLength(16) languageCode: string;
  @IsObject() dictionary: Record<string, string>;
}
