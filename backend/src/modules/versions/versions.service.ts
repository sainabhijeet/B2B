import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersion } from '../../common/entities/app-version.entity';
import { BuildArtifact } from '../../common/entities/build-artifact.entity';
import { BuildJob } from '../../common/entities/build-job.entity';
import { PLATFORM_ROLES } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CreateVersionDto } from './dto/create-version.dto';
import { ListVersionsQueryDto } from './dto/list-versions-query.dto';
import { ReleaseVersionDto } from './dto/release-version.dto';

@Injectable()
export class VersionsService {
  constructor(
    @InjectRepository(AppVersion)
    private readonly versionsRepo: Repository<AppVersion>,
    @InjectRepository(BuildJob)
    private readonly buildJobsRepo: Repository<BuildJob>,
    @InjectRepository(BuildArtifact)
    private readonly artifactsRepo: Repository<BuildArtifact>,
  ) {}

  async create(user: JwtUserPayload, dto: CreateVersionDto) {
    const buildJob = await this.buildJobsRepo.findOne({ where: { id: dto.buildJobId } });
    if (!buildJob) throw new NotFoundException('Build job not found.');
    this.ensureTenantAccess(user, buildJob.tenantId);

    if (dto.artifactId) {
      const artifact = await this.artifactsRepo.findOne({ where: { id: dto.artifactId, buildJobId: buildJob.id } });
      if (!artifact) throw new BadRequestException('Artifact not found for this build.');
    }

    const latest = await this.versionsRepo.findOne({
      where: { tenantId: buildJob.tenantId },
      order: { versionCode: 'DESC' },
    });
    const nextCode = (latest?.versionCode ?? 0) + 1;
    const nextName = dto.versionName ?? this.bumpPatch(latest?.versionName ?? '1.0.0');

    const saved = await this.versionsRepo.save(
      this.versionsRepo.create({
        tenantId: buildJob.tenantId,
        buildJobId: buildJob.id,
        artifactId: dto.artifactId ?? null,
        versionCode: nextCode,
        versionName: nextName,
        releaseNotes: dto.releaseNotes ?? null,
        status: 'DRAFT',
      }),
    );
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async list(user: JwtUserPayload, query: ListVersionsQueryDto) {
    const tenantId = PLATFORM_ROLES.includes(user.role) ? query.tenantId : user.tenantId ?? undefined;
    if (!tenantId && !PLATFORM_ROLES.includes(user.role)) throw new ForbiddenException('Tenant context required.');

    const qb = this.versionsRepo.createQueryBuilder('v');
    if (tenantId) qb.andWhere('v.tenant_id = :tenantId', { tenantId });
    if (query.status) qb.andWhere('v.status = :status', { status: query.status });
    qb.orderBy('v.created_at', 'DESC');
    const data = await qb.getMany();
    return { success: true, data, meta: {}, message: '' };
  }

  async getById(user: JwtUserPayload, id: string) {
    const version = await this.versionsRepo.findOne({ where: { id } });
    if (!version) throw new NotFoundException('Version not found.');
    this.ensureTenantAccess(user, version.tenantId);
    return { success: true, data: version, meta: {}, message: '' };
  }

  async release(user: JwtUserPayload, id: string, dto: ReleaseVersionDto) {
    const version = await this.versionsRepo.findOne({ where: { id } });
    if (!version) throw new NotFoundException('Version not found.');
    this.ensureTenantAccess(user, version.tenantId);

    if (version.status === 'PUBLISHED') {
      return { success: true, data: version, meta: {}, message: 'Already published' };
    }

    await this.versionsRepo.update(
      { tenantId: version.tenantId, status: 'PUBLISHED' },
      { status: 'ARCHIVED' },
    );
    version.status = 'PUBLISHED';
    if (dto.releaseNotes !== undefined) version.releaseNotes = dto.releaseNotes;
    const saved = await this.versionsRepo.save(version);
    return { success: true, data: saved, meta: {}, message: 'Version published' };
  }

  private ensureTenantAccess(user: JwtUserPayload, tenantId: string) {
    if (PLATFORM_ROLES.includes(user.role)) return;
    if (!user.tenantId || user.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }
  }

  private bumpPatch(versionName: string): string {
    const [major, minor, patch] = versionName.split('.').map((v) => Number(v));
    if ([major, minor, patch].some((n) => Number.isNaN(n))) return '1.0.0';
    return `${major}.${minor}.${patch + 1}`;
  }
}
