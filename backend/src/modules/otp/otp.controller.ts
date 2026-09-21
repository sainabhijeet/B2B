import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp.service';

@Controller('otp')
@ApiTags('Auth')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.otpService.requestOtp(dto.tenantId, dto.phone);
  }

  @Post('verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.otpService.verifyOtp(dto.tenantId, dto.phone, dto.code);
    return { verified: true };
  }
}
