import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { EnableTenantWhatsappDto } from '../dto/enable-tenant-whatsapp.dto';
import { PlatformTenantWhatsappService } from '../services/platform-tenant-whatsapp.service';

@Controller('platform/tenants/:tenantId/whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Platform tenant WhatsApp')
@ApiBearerAuth('bearer')
export class PlatformTenantWhatsappController {
  constructor(private readonly platformWa: PlatformTenantWhatsappService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiOperation({ summary: 'WhatsApp mapping status (no access token returned)' })
  status(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.platformWa.getStatus(tenantId);
  }

  @Post('enable')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Enable / upsert line: `phoneNumberId`, optional `useOwnToken` (default false). When `useOwnToken` is true, send `accessToken`, `verifyToken`, and `appSecret` (same roles as WHATSAPP_* env); each may be omitted on update if already stored — required when missing in DB. Optional `whatsappBusinessAccountId` (WABA id) enables distributor Meta template sync.',
  })
  enable(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: EnableTenantWhatsappDto,
  ) {
    return this.platformWa.enable(tenantId, dto);
  }

  @Post('disable')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Disable WhatsApp for tenant (sets is_active=false on all rows; does not delete)' })
  disable(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.platformWa.disable(tenantId);
  }
}
