import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Max, Min } from 'class-validator';

export class PlatformAuthSettingsDto {
  @ApiProperty({ enum: ['firebase', 'msg91', 'custom_sms'], example: 'msg91' })
  @IsIn(['firebase', 'msg91', 'custom_sms'])
  otpProvider: 'firebase' | 'msg91' | 'custom_sms';

  @ApiProperty({ example: 5, minimum: 1, maximum: 1440 })
  @IsInt()
  @Min(1)
  @Max(1440)
  otpExpiryMinutes: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  maxLoginAttempts: number;

  @ApiProperty({ example: 60, minimum: 5, maximum: 43200 })
  @IsInt()
  @Min(5)
  @Max(43200)
  sessionTimeoutMinutes: number;
}
