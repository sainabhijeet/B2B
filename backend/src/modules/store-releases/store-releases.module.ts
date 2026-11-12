import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppVersion } from '../../common/entities/app-version.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { BuildArtifact } from '../../common/entities/build-artifact.entity';
import { BuildJob } from '../../common/entities/build-job.entity';
import { StoreRelease } from './store-release.entity';
import { StoreReleaseEvent } from './store-release-event.entity';
import { StoreReleaseSettings } from './store-release-settings.entity';
import { StoreReleasesController } from './store-releases.controller';
import { StoreReleasesService } from './store-releases.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoreRelease,
      StoreReleaseEvent,
      StoreReleaseSettings,
      BuildArtifact,
      BuildJob,
      AppVersion,
      AuditLog,
    ]),
  ],
  controllers: [StoreReleasesController],
  providers: [StoreReleasesService],
  exports: [StoreReleasesService],
})
export class StoreReleasesModule {}
