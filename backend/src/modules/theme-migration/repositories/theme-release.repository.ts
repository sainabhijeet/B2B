import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeRelease } from '../entities/theme-release.entity';

@Injectable()
export class ThemeReleaseRepository {
  constructor(
    @InjectRepository(ThemeRelease)
    private readonly repository: Repository<ThemeRelease>,
  ) {}

  count(): Promise<number> {
    return this.repository.count();
  }

  findById(id: string): Promise<ThemeRelease | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByLegacyThemeId(legacyThemeId: string): Promise<ThemeRelease | null> {
    return this.repository.findOne({ where: { legacyThemeId } });
  }
}
