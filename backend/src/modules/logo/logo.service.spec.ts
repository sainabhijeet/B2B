import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { TenantBranding } from '../../common/entities/tenant-branding.entity';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import { LogoService } from './logo.service';

describe('LogoService local fallback', () => {
  it('creates selectable SVG logo variants without an OpenAI key', async () => {
    const config = { get: jest.fn().mockReturnValue('') } as unknown as ConfigService;
    const aiSettings = {
      getResolved: jest.fn().mockResolvedValue({
        colorPalettes: 3,
        taglineSuggestions: 2,
        logoGenerationLimit: 2,
        maxLogoBatchesPerTenant: 5,
      }),
    } as unknown as AiSettingsService;
    const brand = { logoGenerationCount: 0 } as TenantBranding;
    const brandingRepo = {
      findOne: jest.fn().mockResolvedValue(brand),
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
    } as unknown as Repository<TenantBranding>;
    const service = new LogoService(config, aiSettings, brandingRepo);

    const result = await service.generate('tenant-1', {
      business_name: 'Testing & Supply',
      industry: 'Chemicals & Specialty Materials',
      primary_hex: '#0F766E',
      secondary_hex: '#164E63',
      tagline: 'Quality <business> supplies',
    });

    expect(result.generation_source).toBe('local');
    expect(result.logos).toHaveLength(2);
    expect(result.logos.every((logo) => logo.startsWith('data:image/svg+xml;base64,'))).toBe(true);
    expect(result.generations_used).toBe(0);
    expect(brandingRepo.save).not.toHaveBeenCalled();
  });
});
