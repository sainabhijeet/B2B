import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeReleaseCandidate } from '../entities/theme-release-candidate.entity';

@Injectable()
export class ThemeReleaseCandidateRepository {
  constructor(
    @InjectRepository(ThemeReleaseCandidate)
    private readonly repository: Repository<ThemeReleaseCandidate>,
  ) {}

  findById(id: string): Promise<ThemeReleaseCandidate | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<ThemeReleaseCandidate | null> {
    return this.repository.findOne({ where: { idempotencyKey } });
  }

  findByReleaseKey(
    familySlug: string,
    channel: ThemeReleaseCandidate['channel'],
    version: string,
  ): Promise<ThemeReleaseCandidate | null> {
    return this.repository.findOne({ where: { familySlug, channel, version } });
  }

  save(candidate: ThemeReleaseCandidate): Promise<ThemeReleaseCandidate> {
    return this.repository.save(candidate);
  }
}
