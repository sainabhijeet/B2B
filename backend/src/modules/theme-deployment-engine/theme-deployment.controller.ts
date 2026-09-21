import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { ThemeDeploymentService } from './theme-deployment.service';
import type {
  DeploymentActionRequest,
  DeploymentProgressRequest,
  DeploymentRequest,
} from './theme-deployment.contracts';
import type { DeploymentState } from './entities/theme-enterprise-deployment.entity';

@Controller('internal/theme-deployments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
export class ThemeDeploymentController {
  constructor(private readonly deployments: ThemeDeploymentService) {}

  @Post()
  queue(@Body() body: DeploymentRequest, @Req() req: AuthenticatedRequest) {
    return this.deployments.queue(body, {
      userId: req.user.sub,
      role: req.user.role,
    });
  }

  @Get(':deploymentId')
  get(@Param('deploymentId') deploymentId: string) {
    return this.deployments.get(deploymentId);
  }

  @Get(':deploymentId/timeline')
  timeline(@Param('deploymentId') deploymentId: string) {
    return this.deployments.timeline(deploymentId);
  }

  @Get(':deploymentId/snapshot')
  snapshot(@Param('deploymentId') deploymentId: string) {
    return this.deployments.snapshots(deploymentId);
  }

  @Post(':deploymentId/state')
  state(
    @Param('deploymentId') deploymentId: string,
    @Body() body: DeploymentActionRequest & { target: DeploymentState },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.deployments.transition(deploymentId, body, body.target, {
      userId: req.user.sub,
      role: req.user.role,
    });
  }

  @Post(':deploymentId/progress')
  progress(
    @Param('deploymentId') deploymentId: string,
    @Body() body: DeploymentProgressRequest,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.deployments.progress(deploymentId, body, {
      userId: req.user.sub,
      role: req.user.role,
    });
  }

  @Post(':deploymentId/health')
  health(
    @Param('deploymentId') deploymentId: string,
    @Body()
    body: {
      status: 'PASSED' | 'FAILED' | 'PENDING';
      details?: Record<string, unknown>;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.deployments.health(
      deploymentId,
      body.status,
      body.details ?? {},
      { userId: req.user.sub, role: req.user.role },
    );
  }

  @Get('metrics/snapshot')
  metrics() {
    return this.deployments.metricsSnapshot();
  }
}
