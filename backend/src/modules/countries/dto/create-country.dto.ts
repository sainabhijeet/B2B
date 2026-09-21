import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCountryDto {
  @ApiProperty({ example: 'India' })
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'IN', description: 'ISO 3166-1 alpha-2' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(2, 2)
  isoCode: string;

  @ApiProperty({ example: '+91' })
  @Transform(trim)
  @IsString()
  @Matches(/^\+\d{1,15}$/, { message: 'phoneCode must look like +91 or +971' })
  @MaxLength(16)
  phoneCode: string;

  @ApiPropertyOptional({
    description: 'Min national digits (no country code). Omit = platform default 5–14.',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  phoneNationalMin?: number | null;

  @ApiPropertyOptional({
    description: 'Max national digits. Omit = platform default 5–14.',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  phoneNationalMax?: number | null;

  @ApiProperty({ example: 'INR' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiProperty({ example: 'hi', description: 'BCP-47 or short code' })
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  defaultLanguage: string;

  @ApiProperty({ enum: ['active', 'inactive'], example: 'active' })
  @Transform(trim)
  @IsString()
  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  timezone?: string | null;

  @ApiPropertyOptional({ example: '₹' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(16)
  currencySymbol?: string | null;

  @ApiPropertyOptional({ example: 'GST' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  taxSystem?: string | null;
}
