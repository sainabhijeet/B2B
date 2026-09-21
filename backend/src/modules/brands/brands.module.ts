import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Brand } from '../../common/entities/brand.entity';
import { MasterBrand } from '../../common/entities/master-brand.entity';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';

@Module({
  imports: [TenancyModule, TypeOrmModule.forFeature([MasterBrand, Brand])],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
