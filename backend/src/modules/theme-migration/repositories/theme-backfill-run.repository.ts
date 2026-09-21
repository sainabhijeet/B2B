import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeBackfillRun } from '../entities/theme-backfill-run.entity';

@Injectable()
export class ThemeBackfillRunRepository {
  constructor(
    @InjectRepository(ThemeBackfillRun)
    private readonly repository: Repository<ThemeBackfillRun>,
  ) {}

  count(): Promise<number> {
    return this.repository.count();
  }

  async findLatest(): Promise<ThemeBackfillRun | null> {
    const rows = await this.repository.find({
      order: { startedAt: 'DESC' },
      take: 1,
    });
    return rows[0] ?? null;
  }
}
