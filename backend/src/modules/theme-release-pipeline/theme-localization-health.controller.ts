import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ThemeLocalizationHealthService } from './theme-localization-health.service';

@Controller('internal/theme-localization')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
@ApiTags('Theme Localization Health')
@ApiBearerAuth('bearer')
export class ThemeLocalizationHealthController {
  constructor(private readonly healthService: ThemeLocalizationHealthService) {}

  @Get('health')
  health() {
    return this.healthService.health();
  }

  @Get('metrics')
  metrics() {
    return this.healthService.metrics();
  }

  @Get('dashboard')
  dashboard() {
    return this.healthService.health();
  }
}
