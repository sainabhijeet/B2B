import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { CreateStoreReleaseDto } from './dto/create-store-release.dto';
import { UpdateStoreReleaseStatusDto } from './dto/update-store-release-status.dto';
import { UpsertStoreReleaseSettingsDto } from './dto/upsert-store-release-settings.dto';
import { StoreReleasesService } from './store-releases.service';

@Controller('distributor/panel/mobile-releases')
@ApiTags('Distributor mobile store releases')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
@ApiBearerAuth('bearer')
export class StoreReleasesController {
  constructor(private readonly storeReleases: StoreReleasesService) {}

  private tenantId(req: AuthenticatedRequest): string {
    const id = req.user.tenantId;
    if (!id) throw new UnauthorizedException('Tenant context required.');
    return id;
  }

  @Get('settings')
  listSettings(@Req() req: AuthenticatedRequest) {
    return this.storeReleases.listSettings(this.tenantId(req));
  }

  @Patch('settings')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  upsertSettings(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpsertStoreReleaseSettingsDto,
  ) {
    return this.storeReleases.upsertSettings(this.tenantId(req), req.user, dto);
  }

  @Get('eligible-artifacts')
  listEligibleArtifacts(@Req() req: AuthenticatedRequest) {
    return this.storeReleases.listEligibleArtifacts(this.tenantId(req));
  }

  @Get()
  listReleases(@Req() req: AuthenticatedRequest) {
    return this.storeReleases.listReleases(this.tenantId(req));
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  createRelease(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateStoreReleaseDto,
  ) {
    return this.storeReleases.createRelease(this.tenantId(req), req.user, dto);
  }

  @Get(':id')
  getRelease(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.storeReleases.getRelease(this.tenantId(req), id);
  }

  @Patch(':id/status')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateStoreReleaseStatusDto,
  ) {
    return this.storeReleases.updateStatus(
      this.tenantId(req),
      req.user,
      id,
      dto,
    );
  }
}
