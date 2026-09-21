import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

/** Normalized 15-char GSTIN (India). */
export class VerifyGstDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s/g, '').toUpperCase() : value,
  )
  @IsString()
  @Length(15, 15)
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, {
    message: 'Enter a valid 15-character GSTIN.',
  })
  gstin: string;
}
