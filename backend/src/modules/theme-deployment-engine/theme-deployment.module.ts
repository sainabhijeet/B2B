import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThemeEnterpriseDeployment } from './entities/theme-enterprise-deployment.entity';
import { ThemeDeploymentSnapshot } from './entities/theme-deployment-snapshot.entity';
import { ThemeDeploymentEvent } from './entities/theme-deployment-event.entity';
import { ThemeDeploymentQueueEntry } from './entities/theme-deployment-queue-entry.entity';
import { ThemeDeploymentLock } from './entities/theme-deployment-lock.entity';
import { ThemeDeploymentHealthCheck } from './entities/theme-deployment-health-check.entity';
import { ThemeDeploymentProgressEvent } from './entities/theme-deployment-progress.entity';
import { ThemeDeploymentController } from './theme-deployment.controller';
import { ThemeDeploymentService } from './theme-deployment.service';
import { ThemeDeploymentMetricsService } from './theme-deployment-metrics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ThemeEnterpriseDeployment,
      ThemeDeploymentSnapshot,
      ThemeDeploymentEvent,
      ThemeDeploymentQueueEntry,
      ThemeDeploymentLock,
      ThemeDeploymentHealthCheck,
      ThemeDeploymentProgressEvent,
    ]),
  ],
  controllers: [ThemeDeploymentController],
  providers: [ThemeDeploymentService, ThemeDeploymentMetricsService],
  exports: [ThemeDeploymentService],
})
export class ThemeDeploymentEngineModule {}
