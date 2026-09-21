import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import { BrandingImageColorsService } from './branding-image-colors.service';
import { BrandingService } from './branding.service';
import { ExtractColorsDto } from './dto/extract-colors.dto';
import { SuggestPalettesDto } from './dto/suggest-palettes.dto';
import { SuggestTaglinesDto } from './dto/suggest-taglines.dto';

@Controller('branding')
@ApiTags('Branding (AI)')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class BrandingController {
  constructor(
    private readonly branding: BrandingService,
    private readonly aiSettings: AiSettingsService,
    private readonly imageColors: BrandingImageColorsService,
  ) {}

  @Get('ai-limits')
  aiLimits() {
    return this.aiSettings.getResolved();
  }

  @Post('extract-colors')
  extractColors(@Body() dto: ExtractColorsDto) {
    return this.imageColors.extractFromDataUrl(dto.image_data_url);
  }

  @Post('suggest-palettes')
  suggestPalettes(@Body() dto: SuggestPalettesDto) {
    return this.branding.suggestPalettes(dto);
  }

  @Post('suggest-taglines')
  suggestTaglines(@Body() dto: SuggestTaglinesDto) {
    return this.branding.suggestTaglines(dto);
  }
}
