import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ThemeRuntimeShadowService } from './theme-runtime-shadow.service';
import type { RuntimeChannel } from './runtime-contracts';

@Controller('internal/theme-runtime')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
export class ThemeRuntimeShadowController {
  constructor(private readonly shadow: ThemeRuntimeShadowService) {}

  @Get('health')
  health() {
    return this.shadow.health();
  }

  @Get('metrics')
  metrics() {
    return this.shadow.metricsSnapshot();
  }

  @Get('reports/:reportId')
  report(@Param('reportId') reportId: string) {
    return this.shadow.getReport(reportId);
  }

  @Get('reports')
  reports(
    @Query('tenantId') tenantId: string,
    @Query('channel') channel: 'WEB' | 'MOBILE',
  ) {
    return this.shadow.listReports(tenantId, channel ?? 'WEB');
  }

  @Get('reports/page')
  page(
    @Query('tenantId') tenantId: string,
    @Query('channel') channel: RuntimeChannel,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.shadow.listReportsPage(
      tenantId,
      channel,
      Number(limit ?? 50),
      cursor,
    );
  }
}
