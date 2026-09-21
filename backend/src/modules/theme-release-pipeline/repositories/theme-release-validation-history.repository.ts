import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeReleaseValidationHistory } from '../entities/theme-release-validation-history.entity';

@Injectable()
export class ThemeReleaseValidationHistoryRepository {
  constructor(
    @InjectRepository(ThemeReleaseValidationHistory)
    private readonly repository: Repository<ThemeReleaseValidationHistory>,
  ) {}

  findByCandidateId(
    candidateId: string,
  ): Promise<ThemeReleaseValidationHistory[]> {
    return this.repository.find({
      where: { candidateId },
      order: { createdAt: 'ASC' },
    });
  }
}
