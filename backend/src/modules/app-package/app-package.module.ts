import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantDistributorApp } from '../../common/entities/tenant-app.entity';
import { AppPackageController } from './app-package.controller';
import { AppPackageService } from './app-package.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantDistributorApp])],
  controllers: [AppPackageController],
  providers: [AppPackageService],
  exports: [AppPackageService],
})
export class AppPackageModule {}
