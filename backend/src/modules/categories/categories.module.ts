import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogAuditLog } from '../../common/entities/catalog-audit-log.entity';
import { Category } from '../../common/entities/category.entity';
import { Industry } from '../../common/entities/industry.entity';
import { Attribute } from '../../common/entities/attribute.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category, CatalogAuditLog, Industry, Attribute, TenantProfile])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
