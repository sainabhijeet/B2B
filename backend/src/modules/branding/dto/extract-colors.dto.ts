import { IsString, MaxLength, MinLength } from 'class-validator';

export class ExtractColorsDto {
  /** `data:image/png;base64,...` (also jpeg, webp, gif). */
  @IsString()
  @MinLength(32)
  @MaxLength(6_000_000)
  image_data_url: string;
}
