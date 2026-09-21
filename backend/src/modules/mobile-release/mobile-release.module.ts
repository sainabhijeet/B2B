import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BuildArtifact } from '../../common/entities/build-artifact.entity';
import { BuildJob } from '../../common/entities/build-job.entity';
import { MobileRelease } from '../../common/entities/mobile-release.entity';
import { MobileReleaseEvent } from '../../common/entities/mobile-release-event.entity';
import { MobileReleaseSettings } from '../../common/entities/mobile-release-settings.entity';
import { Theme } from '../../common/entities/theme.entity';
import { MobileReleaseController } from './mobile-release.controller';
import { MobileReleaseCryptoService } from './mobile-release-crypto.service';
import { MobileReleaseProviderService } from './mobile-release-provider.service';
import { MobileReleaseService } from './mobile-release.service';

@Module({
  imports: [
    AuditLogsModule,
    TypeOrmModule.forFeature([MobileReleaseSettings, MobileRelease, MobileReleaseEvent, BuildArtifact, BuildJob, Theme]),
  ],
  controllers: [MobileReleaseController],
  providers: [MobileReleaseService, MobileReleaseCryptoService, MobileReleaseProviderService],
  exports: [MobileReleaseService],
})
export class MobileReleaseModule {}
