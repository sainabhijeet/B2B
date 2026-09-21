import { IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  tenantId: string;

  @Matches(/^\d{10,15}$/)
  phone: string;
}
