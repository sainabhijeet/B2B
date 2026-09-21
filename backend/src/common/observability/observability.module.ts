import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from './request-context.service';
import { ThemeMigrationTelemetryService } from './theme-migration-telemetry.service';
import { ThemePlatformMetricsService } from './theme-platform-metrics.service';
import { EnterpriseAuditService } from './enterprise-audit.service';
import { LanguageConsistencyService } from '../localization/language-consistency.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    RequestContextService,
    RequestContextMiddleware,
    ThemeMigrationTelemetryService,
    ThemePlatformMetricsService,
    EnterpriseAuditService,
    LanguageConsistencyService,
  ],
  exports: [
    RequestContextService,
    ThemeMigrationTelemetryService,
    ThemePlatformMetricsService,
    EnterpriseAuditService,
    LanguageConsistencyService,
  ],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
