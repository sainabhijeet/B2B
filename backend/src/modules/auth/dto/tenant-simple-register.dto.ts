import { IsEmail, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';

/** Self-service signup: email + password + national phone + country (ISD from DB). Slug/name generated server-side. */
export class TenantSimpleRegisterDto {
  @IsEmail()
  ownerEmail: string;

  @IsString()
  @Length(8, 128)
  ownerPassword: string;

  /** National mobile digits only (country / ISD comes from `countryId`). */
  @IsString()
  @Matches(/^\d{5,14}$/)
  phone: string;

  @IsUUID()
  countryId: string;

  @IsString()
  @Length(1, 128)
  deviceId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  referralCode?: string;
}
