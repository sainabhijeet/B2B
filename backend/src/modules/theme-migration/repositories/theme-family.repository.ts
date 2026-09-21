import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeFamily } from '../entities/theme-family.entity';

@Injectable()
export class ThemeFamilyRepository {
  constructor(
    @InjectRepository(ThemeFamily)
    private readonly repository: Repository<ThemeFamily>,
  ) {}

  count(): Promise<number> {
    return this.repository.count();
  }

  findById(id: string): Promise<ThemeFamily | null> {
    return this.repository.findOne({ where: { id } });
  }

  findBySlug(slug: string): Promise<ThemeFamily | null> {
    return this.repository.findOne({ where: { slug } });
  }
}
