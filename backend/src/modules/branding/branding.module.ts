import { Module } from '@nestjs/common';
import { BrandingController } from './branding.controller';
import { BrandingImageColorsService } from './branding-image-colors.service';
import { BrandingService } from './branding.service';

@Module({
  controllers: [BrandingController],
  providers: [BrandingService, BrandingImageColorsService],
  exports: [BrandingService],
})
export class BrandingModule {}
