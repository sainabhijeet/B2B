import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeBundle } from '../entities/theme-bundle.entity';

@Injectable()
export class ThemeBundleRepository {
  constructor(
    @InjectRepository(ThemeBundle)
    private readonly repository: Repository<ThemeBundle>,
  ) {}

  count(): Promise<number> {
    return this.repository.count();
  }

  findById(id: string): Promise<ThemeBundle | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByLegacyComboId(legacyComboId: string): Promise<ThemeBundle | null> {
    return this.repository.findOne({ where: { legacyComboId } });
  }
}
