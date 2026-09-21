import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantAppSettings } from '../entities/tenant-app-settings.entity';
import { LanguageConsistencyService } from './language-consistency.service';
import { LocalizationService } from './localization.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([TenantAppSettings])],
  providers: [LanguageConsistencyService, LocalizationService],
  exports: [LanguageConsistencyService, LocalizationService],
})
export class LocalizationModule {}
