import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { DistributorPanelService } from './distributor-panel.service';
import { UpdateAppConfigDto } from '../app-config/dto/update-app-config.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';

@Controller('distributor/panel')
@ApiTags('Distributor panel')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
@ApiBearerAuth('bearer')
export class DistributorPanelController {
  constructor(private readonly panel: DistributorPanelService) {}

  private tenantId(req: AuthenticatedRequest): string {
    const id = req.user.tenantId;
    if (!id) throw new UnauthorizedException('Tenant context required.');
    return id;
  }

  @Get('white-label-status')
  whiteLabelStatus(@Req() req: AuthenticatedRequest) {
    return this.panel.getWhiteLabelStatus(this.tenantId(req), req.user.role);
  }

  @Post('mobile-app/build-request')
  requestMobileBuild(@Req() req: AuthenticatedRequest) {
    return this.panel.requestMobileAppBuild(this.tenantId(req));
  }

  @Get('mobile-app/artifact/latest')
  async downloadLatestMobileArtifact(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const artifact = await this.panel.getLatestMobileAppArtifact(this.tenantId(req));
    const asciiFileName = artifact.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    res.set({
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(
        artifact.fileName,
      )}`,
      'Content-Length': String(artifact.fileSize),
    });
    return new StreamableFile(createReadStream(artifact.absolutePath));
  }

  @Get('mobile-app/artifacts/:artifactId')
  async downloadMobileArtifact(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Param('artifactId') artifactId: string,
  ) {
    const artifact = await this.panel.getMobileAppArtifact(this.tenantId(req), artifactId);
    const asciiFileName = artifact.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    res.set({
      'Content-Type': artifact.contentType,
      'Content-Disposition': `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(
        artifact.fileName,
      )}`,
      'Content-Length': String(artifact.fileSize),
    });
    return new StreamableFile(createReadStream(artifact.absolutePath));
  }

  @Get('mobile-app-settings')
  getMobileAppSettings(@Req() req: AuthenticatedRequest) {
    return this.panel.getMobileAppSettings(this.tenantId(req));
  }

  @Patch('mobile-app-settings')
  patchMobileAppSettings(@Req() req: AuthenticatedRequest, @Body() dto: UpdateAppConfigDto) {
    return this.panel.patchMobileAppSettings(this.tenantId(req), dto);
  }

  @Get('payment-settings')
  getPaymentSettings(@Req() req: AuthenticatedRequest) {
    return this.panel.getPaymentSettings(this.tenantId(req));
  }

  @Patch('payment-settings')
  patchPaymentSettings(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdatePaymentSettingsDto,
  ) {
    return this.panel.patchPaymentSettings(this.tenantId(req), dto);
  }

  /** Read-only WhatsApp stats; no phone number id or access token. */
  @Get('whatsapp-analytics')
  whatsappAnalytics(@Req() req: AuthenticatedRequest) {
    return this.panel.getWhatsappAnalytics(this.tenantId(req));
  }
}
