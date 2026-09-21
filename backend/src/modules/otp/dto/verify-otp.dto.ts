import { IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  tenantId: string;

  @Matches(/^\d{10,15}$/)
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
