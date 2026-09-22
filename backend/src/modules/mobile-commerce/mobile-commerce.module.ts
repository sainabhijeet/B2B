import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from '../../common/entities/system-config.entity';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { MobileCommerceController } from './mobile-commerce.controller';

@Module({
  imports: [TenancyModule, TypeOrmModule.forFeature([SystemConfig])],
  controllers: [MobileCommerceController],
})
export class MobileCommerceModule {}
