import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Industry } from '../../common/entities/industry.entity';
import { AdminIndustriesController } from './admin-industries.controller';
import { IndustriesController } from './industries.controller';
import { IndustriesService } from './industries.service';

@Module({
  imports: [TypeOrmModule.forFeature([Industry])],
  controllers: [IndustriesController, AdminIndustriesController],
  providers: [IndustriesService],
  exports: [IndustriesService],
})
export class IndustriesModule {}
