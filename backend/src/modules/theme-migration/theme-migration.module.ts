import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThemeBackfillRun } from './entities/theme-backfill-run.entity';
import { ThemeBundle } from './entities/theme-bundle.entity';
import { ThemeDeployment } from './entities/theme-deployment.entity';
import { ThemeFamily } from './entities/theme-family.entity';
import { ThemeLegacyMapping } from './entities/theme-legacy-mapping.entity';
import { ThemeRelease } from './entities/theme-release.entity';
import { ThemeMigrationHealthController } from './theme-migration-health.controller';
import { ThemeMigrationHealthService } from './theme-migration-health.service';
import { ThemeBackfillRunRepository } from './repositories/theme-backfill-run.repository';
import { ThemeBundleRepository } from './repositories/theme-bundle.repository';
import { ThemeDeploymentRepository } from './repositories/theme-deployment.repository';
import { ThemeFamilyRepository } from './repositories/theme-family.repository';
import { ThemeLegacyMappingRepository } from './repositories/theme-legacy-mapping.repository';
import { ThemeReleaseRepository } from './repositories/theme-release.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ThemeFamily,
      ThemeRelease,
      ThemeBundle,
      ThemeDeployment,
      ThemeLegacyMapping,
      ThemeBackfillRun,
    ]),
  ],
  controllers: [ThemeMigrationHealthController],
  providers: [
    ThemeMigrationHealthService,
    ThemeFamilyRepository,
    ThemeReleaseRepository,
    ThemeBundleRepository,
    ThemeDeploymentRepository,
    ThemeLegacyMappingRepository,
    ThemeBackfillRunRepository,
  ],
})
export class ThemeMigrationModule {}
