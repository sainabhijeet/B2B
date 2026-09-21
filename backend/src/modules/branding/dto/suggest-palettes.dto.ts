import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SuggestPalettesDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  business_name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  industry: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  style?: string;
}
