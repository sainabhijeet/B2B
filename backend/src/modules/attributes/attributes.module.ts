import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attribute } from '../../common/entities/attribute.entity';
import { AttributeValue } from '../../common/entities/attribute-value.entity';
import { CatalogAuditLog } from '../../common/entities/catalog-audit-log.entity';
import { AttributesController } from './attributes.controller';
import { AttributesService } from './attributes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Attribute, AttributeValue, CatalogAuditLog])],
  controllers: [AttributesController],
  providers: [AttributesService],
  exports: [AttributesService],
})
export class AttributesModule {}
