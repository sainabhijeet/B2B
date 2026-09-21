import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PasswordResetToken } from '../../common/entities/password-reset-token.entity';
import { RefreshToken } from '../../common/entities/refresh-token.entity';
import { EmailService } from '../../common/services/email.service';
import { FirebaseAuthService } from '../../common/services/firebase-auth.service';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { CustomersModule } from '../customers/customers.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CountriesModule } from '../countries/countries.module';
import { OtpModule } from '../otp/otp.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StorefrontCustomerController } from './storefront-customer.controller';
import { User } from '../../common/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, PasswordResetToken, User]),
    AuditLogsModule,
    CustomersModule,
    UsersModule,
    TenantsModule,
    CountriesModule,
    OtpModule,
    SystemConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('jwt.accessExpires') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController, StorefrontCustomerController],
  providers: [AuthService, JwtStrategy, FirebaseAuthService, EmailService],
  exports: [AuthService],
})
export class AuthModule {}
