import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ThemeMigrationHealthService } from './theme-migration-health.service';

@Controller('internal/migrations/theme')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
@ApiTags('Internal theme migration')
@ApiBearerAuth('bearer')
export class ThemeMigrationHealthController {
  constructor(private readonly healthService: ThemeMigrationHealthService) {}

  @Get('health')
  getHealth() {
    return this.healthService.getHealth();
  }
}
