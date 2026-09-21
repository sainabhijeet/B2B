import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSettings } from '../../common/entities/ai-settings.entity';
import { PatchAiSettingsDto } from './dto/patch-ai-settings.dto';

export type AiSettingsResolved = {
  colorPalettes: number;
  taglineSuggestions: number;
  logoGenerationLimit: number;
  maxLogoBatchesPerTenant: number;
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

@Injectable()
export class AiSettingsService {
  private static readonly DEFAULT_ID = 'default';

  constructor(
    @InjectRepository(AiSettings)
    private readonly repo: Repository<AiSettings>,
  ) {}

  async getResolved(): Promise<AiSettingsResolved> {
    const row = await this.ensureRow();
    return {
      colorPalettes: clampInt(row.colorPalettes, 1, 10),
      taglineSuggestions: clampInt(row.taglineSuggestions, 1, 10),
      logoGenerationLimit: clampInt(row.logoGenerationLimit, 1, 4),
      maxLogoBatchesPerTenant: clampInt(row.maxLogoBatchesPerTenant, 1, 50),
    };
  }

  async update(dto: PatchAiSettingsDto): Promise<AiSettingsResolved> {
    const row = await this.ensureRow();
    if (dto.colorPalettes !== undefined) {
      row.colorPalettes = clampInt(dto.colorPalettes, 1, 10);
    }
    if (dto.taglineSuggestions !== undefined) {
      row.taglineSuggestions = clampInt(dto.taglineSuggestions, 1, 10);
    }
    if (dto.logoGenerationLimit !== undefined) {
      row.logoGenerationLimit = clampInt(dto.logoGenerationLimit, 1, 4);
    }
    if (dto.maxLogoBatchesPerTenant !== undefined) {
      row.maxLogoBatchesPerTenant = clampInt(dto.maxLogoBatchesPerTenant, 1, 50);
    }
    await this.repo.save(row);
    return this.getResolved();
  }

  private async ensureRow(): Promise<AiSettings> {
    const id = AiSettingsService.DEFAULT_ID;
    let row = await this.repo.findOne({ where: { id } });
    if (!row) {
      row = this.repo.create({
        id,
        colorPalettes: 3,
        taglineSuggestions: 2,
        logoGenerationLimit: 2,
        maxLogoBatchesPerTenant: 5,
      });
      await this.repo.save(row);
    }
    return row;
  }
}
