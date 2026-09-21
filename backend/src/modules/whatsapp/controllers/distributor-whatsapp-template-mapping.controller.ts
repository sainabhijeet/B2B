import { Body, Controller, Get, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../../common/guards/tenant-access.guard';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.type';
import { PutDistributorTemplateMappingDto } from '../dto/put-template-mapping.dto';
import { WhatsappTemplateMappingService } from '../services/whatsapp-template-mapping.service';

@Controller('distributor/whatsapp/template-mapping')
@ApiTags('Distributor WhatsApp template mapping')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
@ApiBearerAuth('bearer')
export class DistributorWhatsappTemplateMappingController {
  constructor(private readonly mappings: WhatsappTemplateMappingService) {}

  private tenantId(req: AuthenticatedRequest): string {
    const id = req.user.tenantId;
    if (!id) throw new UnauthorizedException('Tenant context required.');
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Logical template_key → Meta template name (merged with all hybrid keys)' })
  async list(@Req() req: AuthenticatedRequest) {
    const items = await this.mappings.listMergedSnake(this.tenantId(req));
    return { success: true as const, data: { items } };
  }

  @Put()
  @ApiOperation({
    summary: 'Upsert template mappings; validates Meta name against synced APPROVED UTILITY/AUTH rows',
  })
  async put(@Req() req: AuthenticatedRequest, @Body() dto: PutDistributorTemplateMappingDto) {
    const items = await this.mappings.upsertFromDistributor(this.tenantId(req), dto.items);
    return { success: true as const, data: { items } };
  }
}
