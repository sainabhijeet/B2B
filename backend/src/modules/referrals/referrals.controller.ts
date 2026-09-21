import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { AdminPayoutDto } from './dto/admin-payout.dto';
import { TrackReferralDto } from './dto/track-referral.dto';
import { ReferralsService } from './referrals.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Referrals')
@ApiBearerAuth('bearer')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('referrals/code')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  code(@CurrentUser() user: JwtUserPayload) {
    return this.referralsService.getOrCreateCode(user);
  }

  @Get('referrals/stats')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  stats(@CurrentUser() user: JwtUserPayload) {
    return this.referralsService.stats(user);
  }

  @Get('referrals/conversions')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  conversions(@CurrentUser() user: JwtUserPayload) {
    return this.referralsService.conversions(user);
  }

  @Post('referrals/track')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  track(@CurrentUser() user: JwtUserPayload, @Body() dto: TrackReferralDto) {
    return this.referralsService.trackConversion(user, dto);
  }

  @Get('admin/referrals')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  adminOverview() {
    return this.referralsService.adminOverview();
  }

  @Get('admin/referrals/conversions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  adminConversions() {
    return this.referralsService.adminConversions();
  }

  @Get('admin/referrals/commissions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  adminCommissions() {
    return this.referralsService.adminCommissions();
  }

  @Post('admin/referrals/payout')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  payout(@Body() dto: AdminPayoutDto) {
    return this.referralsService.payout(dto);
  }
}
