import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantDomain } from '../common/entities/tenant-domain.entity';
import { Tenant } from '../common/entities/tenant.entity';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { TenantMiddleware } from './tenant.middleware';
import { TenantResolver } from './tenant.resolver';
import { TenantSchemaService } from './tenant-schema.service';
import { TenantSchemaRunner } from './tenant-schema-runner.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantDomain, Tenant])],
  providers: [TenantResolver, TenantSchemaService, TenantSchemaRunner, TenantMiddleware, TenantContextMiddleware],
  exports: [TenantResolver, TenantSchemaService, TenantSchemaRunner],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware, TenantContextMiddleware).forRoutes('*');
  }
}
