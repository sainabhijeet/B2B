import { Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../../common/guards/tenant-access.guard';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.type';
import { WhatsappMetaTemplateSyncService } from '../services/whatsapp-meta-template-sync.service';

@Controller('distributor/whatsapp/meta-templates')
@ApiTags('Distributor WhatsApp Meta templates')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
@ApiBearerAuth('bearer')
export class DistributorWhatsappTemplateController {
  constructor(private readonly metaSync: WhatsappMetaTemplateSyncService) {}

  private tenantId(req: AuthenticatedRequest): string {
    const id = req.user.tenantId;
    if (!id) throw new UnauthorizedException('Tenant context required.');
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'List synced Meta templates (from DB)' })
  @ApiOkResponse({ description: 'tenant_whatsapp_meta_templates rows' })
  async list(@Req() req: AuthenticatedRequest) {
    const rows = await this.metaSync.listForTenant(this.tenantId(req));
    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        templateName: r.templateName,
        language: r.language,
        category: r.category,
        status: r.status,
        lastSyncedAt: r.lastSyncedAt,
      })),
    };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync Meta message templates from Meta into DB (all categories)' })
  @ApiOkResponse({ description: 'Count of templates written + WABA id used' })
  async sync(@Req() req: AuthenticatedRequest) {
    const { synced, waba_id } = await this.metaSync.syncTemplates(this.tenantId(req));
    return { success: true, data: { synced, waba_id } };
  }
}
