import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeLegacyMapping } from '../entities/theme-legacy-mapping.entity';

@Injectable()
export class ThemeLegacyMappingRepository {
  constructor(
    @InjectRepository(ThemeLegacyMapping)
    private readonly repository: Repository<ThemeLegacyMapping>,
  ) {}

  count(): Promise<number> {
    return this.repository.count();
  }

  findOne(
    legacyEntity: string,
    legacyId: string,
    canonicalEntity: string,
  ): Promise<ThemeLegacyMapping | null> {
    return this.repository.findOne({
      where: { legacyEntity, legacyId, canonicalEntity },
    });
  }
}
