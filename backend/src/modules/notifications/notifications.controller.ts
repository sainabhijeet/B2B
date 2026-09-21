import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { RemoveDeviceTokenDto } from './dto/remove-device-token.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { SetTenantPushConfigDto } from './dto/set-tenant-push-config.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Notifications')
@ApiBearerAuth('bearer')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('devices/token')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  registerDeviceToken(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.notificationsService.registerDeviceToken(user, dto);
  }

  @Delete('devices/token')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  removeDeviceToken(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: RemoveDeviceTokenDto,
  ) {
    return this.notificationsService.removeDeviceToken(user, dto);
  }

  @Get('notifications')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  listNotifications(@CurrentUser() user: JwtUserPayload) {
    return this.notificationsService.listNotifications(user);
  }

  @Get('notifications/unread-count')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  unreadCount(@CurrentUser() user: JwtUserPayload) {
    return this.notificationsService.unreadCount(user);
  }

  @Patch('notifications/read-all')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  markAllRead(@CurrentUser() user: JwtUserPayload) {
    return this.notificationsService.markAllRead(user);
  }

  @Patch('notifications/:id/read')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  markRead(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.notificationsService.markRead(user, id);
  }

  @Post('notifications/send')
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  sendNotification(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: SendNotificationDto,
  ) {
    return this.notificationsService.sendNotification(user, dto);
  }

  @Get('tenant-push-config')
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  getTenantPushConfig(
    @CurrentUser() user: JwtUserPayload,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.notificationsService.getTenantPushConfig(user, tenantId);
  }

  @Post('tenant-push-config')
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  setTenantPushConfig(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: SetTenantPushConfigDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.notificationsService.setTenantPushConfig(user, dto, tenantId);
  }
}
