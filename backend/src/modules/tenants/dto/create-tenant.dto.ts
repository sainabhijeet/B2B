import { IsEmail, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @Length(3, 64)
  slug: string;

  @IsString()
  @Length(2, 255)
  name: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @Length(8, 128)
  ownerPassword: string;

  @Matches(/^\d{10,15}$/)
  ownerPhone: string;

  /** Optional — e.g. distributor OTP country or email self-register country. */
  @IsOptional()
  @IsUUID()
  countryId?: string;

  /** Optional referral code (?ref=) when provisioning tenant; links signup to referrer. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  referralCode?: string;
}
