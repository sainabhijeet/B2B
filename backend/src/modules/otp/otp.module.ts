import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpChallenge } from '../../common/entities/otp-challenge.entity';
import { SmsService } from '../../common/services/sms.service';
import { SystemConfigModule } from '../system-config/system-config.module';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';

@Module({
  imports: [TypeOrmModule.forFeature([OtpChallenge]), SystemConfigModule],
  controllers: [OtpController],
  providers: [OtpService, SmsService],
  exports: [OtpService, SmsService],
})
export class OtpModule {}
