import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiSettings } from '../../common/entities/ai-settings.entity';
import { AdminAiSettingsController } from './admin-ai-settings.controller';
import { AiSettingsService } from './ai-settings.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AiSettings])],
  controllers: [AdminAiSettingsController],
  providers: [AiSettingsService],
  exports: [AiSettingsService, TypeOrmModule],
})
export class AiSettingsModule {}
