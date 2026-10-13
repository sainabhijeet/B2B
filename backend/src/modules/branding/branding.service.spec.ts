import { ConfigService } from '@nestjs/config';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import { BrandingService } from './branding.service';

describe('BrandingService local fallback', () => {
  const aiSettings = {
    getResolved: jest.fn().mockResolvedValue({
      colorPalettes: 3,
      taglineSuggestions: 2,
      logoGenerationLimit: 2,
      maxLogoBatchesPerTenant: 5,
    }),
  } as unknown as AiSettingsService;

  const service = new BrandingService(
    { get: jest.fn().mockReturnValue('') } as unknown as ConfigService,
    aiSettings,
  );

  it('returns valid deterministic palettes when OpenAI is not configured', async () => {
    const result = await service.suggestPalettes({
      business_name: 'Testing',
      industry: 'Chemicals & Specialty Materials',
    });

    expect(result.palettes).toHaveLength(3);
    for (const palette of result.palettes) {
      expect(palette.primary).toMatch(/^#[0-9A-F]{6}$/);
      expect(palette.secondary).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('returns the requested number of varied industry palettes', async () => {
    const result = await service.suggestPalettes({
      business_name: 'Vijiya',
      industry: 'Beauty & Personal Care',
      style: 'varied professional',
      count: 9,
    });

    expect(result.palettes).toHaveLength(9);
    expect(new Set(result.palettes.map((palette) => palette.primary)).size).toBe(9);
    expect(result.palettes[0]?.label).toMatch(/Beauty|Orchid|Plum/);
  });

  it('returns local tagline suggestions when OpenAI is not configured', async () => {
    const result = await service.suggestTaglines({
      business_name: 'Testing',
      industry: 'Chemicals & Specialty Materials',
    });

    expect(result.taglines).toHaveLength(2);
    expect(result.taglines[0]).toContain('Testing');
    expect(result.font_hint).toBeTruthy();
  });
});
