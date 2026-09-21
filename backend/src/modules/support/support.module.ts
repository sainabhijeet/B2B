import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from '../../common/entities/support-ticket.entity';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { StorefrontSupportController } from './storefront-support.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket]), NotificationsModule],
  controllers: [SupportController, StorefrontSupportController],
  providers: [SupportService],
})
export class SupportModule {}
