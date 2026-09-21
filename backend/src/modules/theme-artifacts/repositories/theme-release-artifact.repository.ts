import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeReleaseArtifact } from '../entities/theme-release-artifact.entity';

@Injectable()
export class ThemeReleaseArtifactRepository {
  constructor(
    @InjectRepository(ThemeReleaseArtifact)
    private readonly repository: Repository<ThemeReleaseArtifact>,
  ) {}

  count(): Promise<number> {
    return this.repository.count();
  }

  findByLegacyThemeId(
    legacyThemeId: string,
  ): Promise<ThemeReleaseArtifact | null> {
    return this.repository.findOne({
      where: { legacyThemeId, artifactType: 'ZIP' },
    });
  }

  findByReleaseId(
    themeReleaseId: string,
  ): Promise<ThemeReleaseArtifact | null> {
    return this.repository.findOne({
      where: { themeReleaseId, artifactType: 'ZIP' },
    });
  }

  findAll(): Promise<ThemeReleaseArtifact[]> {
    return this.repository.find({ order: { createdAt: 'ASC' } });
  }
}
