import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CustomerAddressInputDto {
  @IsOptional()
  @IsString()
  @Length(0, 64)
  label?: string;

  @IsString()
  @Length(1, 255)
  line1: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  line2?: string;

  @IsString()
  @Length(1, 128)
  city: string;

  @IsString()
  @Length(1, 128)
  state: string;

  @IsString()
  @Length(1, 32)
  pincode: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/u)
  countryCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
