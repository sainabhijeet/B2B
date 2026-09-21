import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ListSystemConfigQueryDto } from './dto/list-system-config-query.dto';
import { SetCatalogMediaConfigDto } from './dto/set-catalog-media-config.dto';
import { SetSystemConfigDto } from './dto/set-system-config.dto';
import { SystemConfigService } from './system-config.service';

@Controller('system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Configs')
@ApiBearerAuth('bearer')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  set(@Body() dto: SetSystemConfigDto) {
    return this.systemConfigService.setConfig(dto);
  }

  @Post('catalog-media')
  @Roles(UserRole.SUPER_ADMIN)
  setCatalogMedia(@Body() dto: SetCatalogMediaConfigDto) {
    return this.systemConfigService.setCatalogMediaConfig(dto);
  }

  @Get('catalog-media/current')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  getCatalogMedia(@Query('tenantId') tenantId?: string) {
    return this.systemConfigService.getCatalogMediaConfig(tenantId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  list(@Query() query: ListSystemConfigQueryDto) {
    return this.systemConfigService.listConfigPage(query);
  }

  @Get(':key')
  @Roles(UserRole.SUPER_ADMIN)
  get(@Param('key') key: string) {
    return this.systemConfigService.getConfig(key);
  }
}
