import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { AppPackageService } from './app-package.service';

@Controller('app')
@ApiTags('App package')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class AppPackageController {
  constructor(private readonly appPackage: AppPackageService) {}

  @Get('check-package')
  checkPackage(
    @Req() req: AuthenticatedRequest,
    @Query('package') packageQuery?: string,
  ) {
    return this.appPackage.checkPackage(packageQuery ?? '', req.user.tenantId ?? null);
  }
}
