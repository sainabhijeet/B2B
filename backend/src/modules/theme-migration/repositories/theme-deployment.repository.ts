import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeDeployment } from '../entities/theme-deployment.entity';

@Injectable()
export class ThemeDeploymentRepository {
  constructor(
    @InjectRepository(ThemeDeployment)
    private readonly repository: Repository<ThemeDeployment>,
  ) {}

  count(): Promise<number> {
    return this.repository.count();
  }

  findActiveByTenant(tenantId: string): Promise<ThemeDeployment | null> {
    return this.repository.findOne({
      where: { tenantId, environment: 'PRODUCTION', status: 'ACTIVE' },
    });
  }

  findByLegacyTenantThemeId(
    legacyTenantThemeId: string,
  ): Promise<ThemeDeployment | null> {
    return this.repository.findOne({ where: { legacyTenantThemeId } });
  }
}
