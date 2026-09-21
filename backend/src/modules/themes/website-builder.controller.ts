import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { ThemesService } from './themes.service';

@ApiTags('Website Builder')
@ApiBearerAuth('bearer')
@Controller('distributor/website-builder')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebsiteBuilderController {
  constructor(private readonly themesService: ThemesService) {}

  @Get('theme-info')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  themeInfo(@CurrentUser() user: JwtUserPayload) {
    return this.themesService.websiteBuilderThemeInfo(user);
  }
}
