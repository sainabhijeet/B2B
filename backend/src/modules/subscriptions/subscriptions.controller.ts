import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Subscriptions')
@ApiBearerAuth('bearer')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT, UserRole.OWNER, UserRole.MANAGER)
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post('subscribe')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  subscribe(@Body() dto: SubscribeDto) {
    return this.subscriptionsService.subscribe(dto);
  }

  @Get('current')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  current(@CurrentUser() user: JwtUserPayload) {
    return this.subscriptionsService.getCurrent(user);
  }
}
