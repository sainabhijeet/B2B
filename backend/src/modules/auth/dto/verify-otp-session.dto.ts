import {
  IsIn,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';
import { OtpPurpose, type OtpPurposeValue } from '../../otp/otp-purpose';

export class VerifyOtpSessionDto {
  @IsIn([OtpPurpose.CUSTOMER_TENANT, OtpPurpose.DISTRIBUTOR_PANEL])
  purpose: OtpPurposeValue;

  @ValidateIf((o: VerifyOtpSessionDto) => o.purpose === OtpPurpose.DISTRIBUTOR_PANEL)
  @IsUUID()
  countryId?: string;

  @ValidateIf((o: VerifyOtpSessionDto) => o.purpose === OtpPurpose.DISTRIBUTOR_PANEL)
  @IsString()
  @Matches(/^\d{5,14}$/)
  nationalPhone?: string;

  @ValidateIf((o: VerifyOtpSessionDto) => o.purpose === OtpPurpose.CUSTOMER_TENANT)
  @IsUUID()
  tenantId?: string;

  @ValidateIf((o: VerifyOtpSessionDto) => o.purpose === OtpPurpose.CUSTOMER_TENANT)
  @IsString()
  @Matches(/^\d{8,20}$/)
  phone?: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;

  @IsString()
  @Length(1, 128)
  deviceId: string;
}
