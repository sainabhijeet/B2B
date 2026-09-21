import { IsIn, IsOptional, IsString, IsUUID, Matches, ValidateIf } from 'class-validator';
import { OtpPurpose, type OtpPurposeValue } from '../../otp/otp-purpose';

export class SendOtpDto {
  @IsIn([OtpPurpose.CUSTOMER_TENANT, OtpPurpose.DISTRIBUTOR_PANEL])
  purpose: OtpPurposeValue;

  @ValidateIf((o: SendOtpDto) => o.purpose === OtpPurpose.DISTRIBUTOR_PANEL)
  @IsUUID()
  countryId?: string;

  @ValidateIf((o: SendOtpDto) => o.purpose === OtpPurpose.DISTRIBUTOR_PANEL)
  @IsString()
  @Matches(/^\d{5,14}$/)
  nationalPhone?: string;

  @ValidateIf((o: SendOtpDto) => o.purpose === OtpPurpose.CUSTOMER_TENANT)
  @IsUUID()
  tenantId?: string;

  @ValidateIf((o: SendOtpDto) => o.purpose === OtpPurpose.CUSTOMER_TENANT)
  @IsString()
  @Matches(/^\d{8,20}$/)
  phone?: string;

  /** Ignored for OTP send; reserved for future channel routing. */
  @IsOptional()
  @IsString()
  deviceId?: string;
}
