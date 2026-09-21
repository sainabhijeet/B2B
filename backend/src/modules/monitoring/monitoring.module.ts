import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildJob } from '../../common/entities/build-job.entity';
import { BuildLog } from '../../common/entities/build-log.entity';
import { BuildMetric } from '../../common/entities/build-metric.entity';
import { WorkerNode } from '../../common/entities/worker-node.entity';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [TypeOrmModule.forFeature([BuildJob, BuildMetric, BuildLog, WorkerNode])],
  controllers: [MonitoringController],
  providers: [MonitoringService],
})
export class MonitoringModule {}
