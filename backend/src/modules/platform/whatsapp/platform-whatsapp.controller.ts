import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListGlobalMetaTemplatesQueryDto } from './dto/list-global-meta-templates-query.dto';
import { PlatformSyncMetaTemplatesDto } from './dto/platform-sync-meta-templates.dto';
import { PutWhatsappTemplateMappingsDto } from './dto/put-whatsapp-template-mappings.dto';
import { UpdateWhatsappConfigDto } from './dto/update-whatsapp-config.dto';
import { PlatformWhatsappService } from './platform-whatsapp.service';

@Controller('platform/whatsapp')
@ApiTags('Platform WhatsApp (super admin)')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth('bearer')
export class PlatformWhatsappController {
  constructor(private readonly platformWhatsapp: PlatformWhatsappService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Tenant × WhatsApp overview table (for control panel)' })
  overview(@Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit: number) {
    return this.platformWhatsapp.listOverview(limit);
  }

  @Get('health')
  @ApiOperation({ summary: 'Aggregate health metrics across tenants' })
  healthSummary() {
    return this.platformWhatsapp.checkHealthSummary();
  }

  @Get('health/:tenantId')
  @ApiOperation({ summary: 'Per-tenant health: token, template count, last sync, webhook' })
  healthTenant(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.platformWhatsapp.checkHealthTenant(tenantId);
  }

  @Get('config/:tenantId')
  @ApiOperation({ summary: 'Get tenant WhatsApp line config (no raw access token)' })
  getConfig(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.platformWhatsapp.getConfig(tenantId);
  }

  @Put('config/:tenantId')
  @ApiOperation({ summary: 'Upsert tenant WhatsApp line (phone id PK); optional validateTokenOnSave' })
  updateConfig(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: UpdateWhatsappConfigDto,
  ) {
    return this.platformWhatsapp.updateConfig(tenantId, dto);
  }

  @Post('config/:tenantId/test-connection')
  @ApiOperation({ summary: 'Meta Graph GET phone_number_id (token sanity check)' })
  testConnection(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.platformWhatsapp.testConnection(tenantId);
  }

  @Post('meta-templates/sync')
  @ApiOperation({
    summary:
      'Sync Meta templates for one tenant (all categories). WABA resolved from line or Graph phone-number lookup.',
  })
  async syncMeta(@Body() body: PlatformSyncMetaTemplatesDto) {
    const { synced, waba_id } = await this.platformWhatsapp.syncMetaTemplates(body.tenantId);
    return { success: true, data: { synced, waba_id } };
  }

  @Post('meta-templates/sync-all')
  @ApiOperation({
    summary:
      'Sync Meta templates for every tenant with an active line + Graph token (WABA auto-resolved when missing)',
  })
  async syncMetaAll() {
    const data = await this.platformWhatsapp.syncAllMetaTemplates();
    return { success: true as const, data };
  }

  @Get('global-meta-templates')
  @ApiOperation({
    summary: 'Central WhatsApp template library (WABA-level; all categories/statuses from last sync)',
  })
  listGlobalMetaTemplates(@Query() q: ListGlobalMetaTemplatesQueryDto) {
    return this.platformWhatsapp.listGlobalMetaTemplates(q);
  }

  @Post('global-meta-templates/sync-all')
  @ApiOperation({ summary: 'Fetch all templates from Meta for every distinct WABA and upsert global library' })
  syncGlobalMetaAll() {
    return this.platformWhatsapp.syncGlobalMetaTemplatesAll();
  }

  @Post('global-meta-templates/sync/:tenantId')
  @ApiOperation({ summary: 'Sync global library for the active line WABA of one tenant' })
  syncGlobalMetaTenant(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.platformWhatsapp.syncGlobalMetaTemplatesTenant(tenantId);
  }

  @Get('meta-templates/:tenantId')
  @ApiOperation({ summary: 'List synced Meta templates for tenant' })
  metaTemplates(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.platformWhatsapp.listMetaTemplates(tenantId);
  }

  @Get('template-mappings/:tenantId')
  @ApiOperation({ summary: 'Logical template_key → Meta template name overrides for tenant' })
  listTemplateMappings(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.platformWhatsapp.listTemplateMappings(tenantId);
  }

  @Put('template-mappings/:tenantId')
  @ApiOperation({ summary: 'Replace all template mappings for tenant (empty items clears overrides)' })
  putTemplateMappings(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: PutWhatsappTemplateMappingsDto,
  ) {
    return this.platformWhatsapp.replaceTemplateMappings(tenantId, dto);
  }
}
