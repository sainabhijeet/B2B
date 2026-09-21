import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ThemeArtifactsHealthService } from './theme-artifacts-health.service';

@Controller('internal/storage/theme')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
@ApiTags('Internal theme artifact storage')
@ApiBearerAuth('bearer')
export class ThemeArtifactsHealthController {
  constructor(private readonly healthService: ThemeArtifactsHealthService) {}

  @Get('health')
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('metrics')
  getMetrics() {
    return this.healthService.getMetrics();
  }
}
