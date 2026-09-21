import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BuildListQueryDto } from './dto/build-list-query.dto';
import { WorkerHeartbeatDto } from './dto/worker-heartbeat.dto';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Monitoring')
@ApiBearerAuth('bearer')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('builds/metrics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  buildMetrics() {
    return this.monitoringService.getBuildMetrics();
  }

  @Get('builds')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  buildJobs(@Query() query: BuildListQueryDto) {
    return this.monitoringService.listBuildJobs(query);
  }

  @Get('builds/:id/logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  buildLogs(@Param('id') id: string) {
    return this.monitoringService.getBuildLogs(id);
  }

  @Get('queue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  queueStats() {
    return this.monitoringService.getQueueStats();
  }

  @Get('workers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  workers() {
    return this.monitoringService.getWorkers();
  }

  @Post('workers/heartbeat')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  heartbeat(@Body() dto: WorkerHeartbeatDto) {
    return this.monitoringService.heartbeat(dto);
  }

  @Get('system')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  systemHealth() {
    return this.monitoringService.getSystemHealth();
  }

  @Get('builds/failures')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  failures() {
    return this.monitoringService.getBuildFailuresAnalytics();
  }

  @Get('builds/performance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  performance() {
    return this.monitoringService.getBuildPerformance();
  }

  @Get('dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  dashboard() {
    return this.monitoringService.getDashboard();
  }
}
