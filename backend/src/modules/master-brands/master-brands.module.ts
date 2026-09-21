import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Industry } from '../../common/entities/industry.entity';
import { MasterBrand } from '../../common/entities/master-brand.entity';
import { MasterBrandsController } from './master-brands.controller';
import { MasterBrandsService } from './master-brands.service';

@Module({
  imports: [TypeOrmModule.forFeature([MasterBrand, Industry])],
  controllers: [MasterBrandsController],
  providers: [MasterBrandsService],
  exports: [MasterBrandsService],
})
export class MasterBrandsModule {}
