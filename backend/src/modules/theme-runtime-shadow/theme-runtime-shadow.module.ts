import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservabilityModule } from '../../common/observability/observability.module';
import { ThemeRuntimeComparisonReportEntity } from './entities/theme-runtime-comparison-report.entity';
import { CanonicalRuntimeResolver } from './canonical-runtime.resolver';
import { ThemeRuntimeShadowService } from './theme-runtime-shadow.service';
import { ThemeRuntimeShadowInterceptor } from './theme-runtime-shadow.interceptor';
import { ThemeRuntimeShadowController } from './theme-runtime-shadow.controller';
import { ThemeRuntimeShadowQueue } from './theme-runtime-shadow.queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThemeRuntimeComparisonReportEntity]),
    ObservabilityModule,
  ],
  controllers: [ThemeRuntimeShadowController],
  providers: [
    CanonicalRuntimeResolver,
    ThemeRuntimeShadowService,
    ThemeRuntimeShadowInterceptor,
    ThemeRuntimeShadowQueue,
  ],
  exports: [ThemeRuntimeShadowService, ThemeRuntimeShadowInterceptor],
})
export class ThemeRuntimeShadowModule {}
