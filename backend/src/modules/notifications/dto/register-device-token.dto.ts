import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  token: string;

  @IsIn(['ANDROID', 'IOS', 'WEB'])
  deviceType: 'ANDROID' | 'IOS' | 'WEB';

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}
