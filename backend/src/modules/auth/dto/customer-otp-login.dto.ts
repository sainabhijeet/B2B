import { IsString, Length, Matches } from 'class-validator';

export class CustomerOtpLoginDto {
  @IsString()
  tenantId: string;

  @Matches(/^\d{8,20}$/)
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;

  @IsString()
  deviceId: string;
}
