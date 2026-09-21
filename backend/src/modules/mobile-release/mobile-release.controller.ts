import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import type { AuthenticatedRequest, JwtUserPayload } from '../../common/types/authenticated-request.type';
import { PutMobileReleaseSettingsDto } from './dto/mobile-release-settings.dto';
import { SubmitAppleReviewDto, UploadAppStoreDto, UploadGooglePlayDto } from './dto/release-action.dto';
import { MobileReleaseService } from './mobile-release.service';

@Controller('mobile-releases')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
@ApiTags('Mobile Release Management')
@ApiBearerAuth('bearer')
export class MobileReleaseController {
  constructor(private readonly releases: MobileReleaseService) {}

  @Get('settings')
  settings(@CurrentUser() user: JwtUserPayload, @Query('tenantId') tenantId?: string) {
    return this.releases.getSettings(user, tenantId);
  }

  @Put('settings')
  putSettings(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: PutMobileReleaseSettingsDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.releases.putSettings(user, dto, tenantId);
  }

  @Get()
  list(@CurrentUser() user: JwtUserPayload, @Query('tenantId') tenantId?: string) {
    return this.releases.listReleases(user, tenantId);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.releases.getRelease(user, id);
  }

  @Post('google-play/upload')
  uploadGoogle(@CurrentUser() user: JwtUserPayload, @Body() dto: UploadGooglePlayDto, @Req() req: AuthenticatedRequest) {
    return this.releases.uploadGooglePlay(user, dto, req.ip);
  }

  @Post('app-store/upload')
  uploadApple(@CurrentUser() user: JwtUserPayload, @Body() dto: UploadAppStoreDto, @Req() req: AuthenticatedRequest) {
    return this.releases.uploadAppStore(user, dto, req.ip);
  }

  @Post(':id/apple/submit')
  submitApple(@CurrentUser() user: JwtUserPayload, @Param('id') id: string, @Body() dto: SubmitAppleReviewDto) {
    return this.releases.submitApple(user, id, dto.destination);
  }

  @Post(':id/rollback')
  rollback(@CurrentUser() user: JwtUserPayload, @Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.releases.rollback(user, id, req.ip);
  }
}
