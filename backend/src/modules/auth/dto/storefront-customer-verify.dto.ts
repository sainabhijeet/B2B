import { IsString, Length, Matches } from 'class-validator';

export class StorefrontCustomerVerifyDto {
  @IsString()
  @Matches(/^\d{8,20}$/)
  mobile: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;

  @IsString()
  @Length(1, 128)
  deviceId: string;
}
