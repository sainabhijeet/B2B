import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { AppConfigService } from './app-config.service';
import { UpdateAppConfigDto } from './dto/update-app-config.dto';

@ApiTags('Distributor app config')
@Controller('distributor')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
@ApiBearerAuth('bearer')
export class DistributorAppConfigController {
  constructor(private readonly appConfig: AppConfigService) {}

  private tenantId(req: AuthenticatedRequest): string {
    const id = req.user.tenantId;
    if (!id) throw new UnauthorizedException('Tenant context required.');
    return id;
  }

  @Get('app-config')
  async get(@Req() req: AuthenticatedRequest) {
    const data = await this.appConfig.getForTenant(this.tenantId(req));
    return { success: true, data, meta: {}, message: '' };
  }

  @Put('app-config')
  async put(@Req() req: AuthenticatedRequest, @Body() dto: UpdateAppConfigDto) {
    const data = await this.appConfig.updateForTenant(this.tenantId(req), dto);
    return { success: true, data, meta: {}, message: '' };
  }
}
