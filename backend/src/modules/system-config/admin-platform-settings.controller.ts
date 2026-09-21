import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlatformAuthSettingsDto } from './dto/platform-auth-settings.dto';
import { PutFirebaseAdminDto } from './dto/put-firebase-admin.dto';
import { PutSmsProvidersDto } from './dto/sms-provider-item.dto';
import { FirebaseAdminLifecycleService } from './firebase-admin-lifecycle.service';
import { PlatformSettingsService } from './platform-settings.service';

@Controller('admin/platform-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Platform settings')
@ApiBearerAuth('bearer')
export class AdminPlatformSettingsController {
  constructor(
    private readonly platformSettings: PlatformSettingsService,
    private readonly firebaseLifecycle: FirebaseAdminLifecycleService,
  ) {}

  @Get('auth')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiOkResponse({
    description:
      'OTP / session policy (system_config) plus `availableOtpProviders` derived from active SMS rows in DB.',
  })
  getAuth() {
    return this.platformSettings.getAuthSettings();
  }

  @Put('auth')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOkResponse({ description: 'Replace platform auth settings.' })
  putAuth(@Body() dto: PlatformAuthSettingsDto) {
    return this.platformSettings.setAuthSettings(dto);
  }

  @Get('sms-providers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiOkResponse({ description: 'SMS integrations (API keys masked).' })
  getSms() {
    return this.platformSettings.getSmsProvidersMasked();
  }

  @Put('sms-providers')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOkResponse({ description: 'Replace SMS provider list (merge apiKey when omitted).' })
  putSms(@Body() dto: PutSmsProvidersDto) {
    return this.platformSettings.setSmsProviders(dto.providers);
  }

  @Get('firebase-admin')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiOkResponse({ description: 'Firebase Admin (FCM + Auth verifyIdToken); private key masked.' })
  getFirebaseAdmin() {
    return this.platformSettings.getFirebaseAdminMasked();
  }

  @Put('firebase-admin')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOkResponse({ description: 'Replace platform Firebase Admin JSON (merge privateKey when omitted).' })
  async putFirebaseAdmin(@Body() dto: PutFirebaseAdminDto) {
    const out = await this.platformSettings.setFirebaseAdmin(dto);
    await this.firebaseLifecycle.invalidate();
    return out;
  }
}
