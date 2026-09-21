import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { SelectDistributorThemeDto } from './dto/select-distributor-theme.dto';
import { ThemesService } from './themes.service';

@ApiTags('Distributor themes')
@Controller('distributor/themes')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.PLATFORM_SUPPORT,
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.STAFF,
)
@ApiBearerAuth('bearer')
export class DistributorThemesController {
  constructor(private readonly themesService: ThemesService) {}

  /** Theme gallery (Level 1): preview image + layout hint. `channel=WEB` | `MOBILE` (default WEB). */
  @Get()
  listGallery(@Query('channel') channel?: string) {
    const ch = channel?.trim().toUpperCase() === 'MOBILE' ? 'MOBILE' : 'WEB';
    return this.themesService.listDistributorThemeGallery(ch);
  }

  @Post('select')
  select(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: SelectDistributorThemeDto,
  ) {
    return this.themesService.selectByThemeIdBody(user, dto);
  }
}
