import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from '../../common/entities/system-config.entity';
import { FirebaseIntegration } from '../../integrations/firebase/firebase.integration';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AdminPlatformSettingsController } from './admin-platform-settings.controller';
import { SystemConfigController } from './system-config.controller';
import { FirebaseAdminLifecycleService } from './firebase-admin-lifecycle.service';
import { PlatformSettingsService } from './platform-settings.service';
import { SystemConfigService } from './system-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig]), AuditLogsModule],
  controllers: [SystemConfigController, AdminPlatformSettingsController],
  providers: [
    SystemConfigService,
    PlatformSettingsService,
    FirebaseAdminLifecycleService,
    FirebaseIntegration,
  ],
  exports: [
    SystemConfigService,
    PlatformSettingsService,
    FirebaseAdminLifecycleService,
    FirebaseIntegration,
  ],
})
export class SystemConfigModule {}
