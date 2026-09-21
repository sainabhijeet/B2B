import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../common/entities/notification.entity';
import { TenantPushConfig } from '../../common/entities/tenant-push-config.entity';
import { UserDeviceToken } from '../../common/entities/user-device-token.entity';
import { User } from '../../common/entities/user.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserDeviceToken,
      TenantPushConfig,
      Notification,
      User,
    ]),
    SubscriptionsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
