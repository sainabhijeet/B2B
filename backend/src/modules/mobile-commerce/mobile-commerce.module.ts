import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from '../../common/entities/system-config.entity';
import { MobileCommerceController } from './mobile-commerce.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  controllers: [MobileCommerceController],
})
export class MobileCommerceModule {}
