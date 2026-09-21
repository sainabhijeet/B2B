import { IsArray, IsString, MaxLength, ArrayMaxSize } from 'class-validator';

export class BulkTranslationDto {
  @IsArray() @ArrayMaxSize(1000) @IsString({ each: true }) entryIds: string[];
  @IsString() @MaxLength(10000) translationText: string;
}
