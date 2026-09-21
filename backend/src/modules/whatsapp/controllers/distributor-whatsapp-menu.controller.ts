import { Body, Controller, Get, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../../common/guards/tenant-access.guard';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.type';
import { PutTenantWhatsappMenuDto } from '../dto/put-tenant-whatsapp-menu.dto';
import { WhatsappMenuService } from '../services/whatsapp-menu.service';

@Controller('distributor/whatsapp-menu')
@ApiTags('Distributor WhatsApp menu')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
@ApiBearerAuth('bearer')
export class DistributorWhatsappMenuController {
  constructor(private readonly menu: WhatsappMenuService) {}

  private tenantId(req: AuthenticatedRequest): string {
    const id = req.user.tenantId;
    if (!id) throw new UnauthorizedException('Tenant context required.');
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'List WhatsApp main-menu rows (all fixed keys + tenant overrides)' })
  @ApiOkResponse({ description: 'Menu configuration for Settings → WhatsApp' })
  list(@Req() req: AuthenticatedRequest) {
    return this.menu.listTenantMenuForAdmin(this.tenantId(req));
  }

  @Put()
  @ApiOperation({ summary: 'Replace WhatsApp main-menu configuration' })
  @ApiOkResponse({ description: 'Saved' })
  async put(@Req() req: AuthenticatedRequest, @Body() body: PutTenantWhatsappMenuDto) {
    await this.menu.replaceTenantMenu(this.tenantId(req), body.items);
    return { ok: true };
  }
}
