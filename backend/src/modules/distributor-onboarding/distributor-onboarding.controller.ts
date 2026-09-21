import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { DistributorOnboardingService } from './distributor-onboarding.service';
import { SaveOnboardingStepDto } from './dto/save-onboarding-step.dto';

@Controller('distributor/onboarding')
@ApiTags('Distributor onboarding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class DistributorOnboardingController {
  constructor(private readonly onboarding: DistributorOnboardingService) {}

  private tenantId(req: AuthenticatedRequest): string {
    const id = req.user.tenantId;
    if (!id) throw new UnauthorizedException('Tenant context required.');
    return id;
  }

  @Get('status')
  getStatus(@Req() req: AuthenticatedRequest) {
    return this.onboarding.getStatus(this.tenantId(req));
  }

  @Get('languages')
  listLanguages() {
    return this.onboarding.listLanguages();
  }

  @Put('languages')
  saveLanguages(@Body() body: { languages?: unknown[] }) {
    return this.onboarding.saveLanguages((body.languages ?? []) as never);
  }

  @Get('store-url-preview')
  storeUrlPreview(
    @Req() req: AuthenticatedRequest,
    @Query('brand') brand?: string,
  ) {
    return this.onboarding.previewStoreUrl(this.tenantId(req), brand);
  }

  @Get('subdomain-availability')
  subdomainAvailability(
    @Req() req: AuthenticatedRequest,
    @Query('subdomain') subdomain?: string,
  ) {
    return this.onboarding.checkSubdomainAvailability(
      this.tenantId(req),
      subdomain ?? '',
    );
  }

  @Post('save-step')
  saveStep(@Req() req: AuthenticatedRequest, @Body() dto: SaveOnboardingStepDto) {
    return this.onboarding.saveStep(this.tenantId(req), dto);
  }

  @Post('complete')
  complete(@Req() req: AuthenticatedRequest) {
    return this.onboarding.complete(this.tenantId(req));
  }
}
