import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Industry } from '../../common/entities/industry.entity';
import { MasterBrand } from '../../common/entities/master-brand.entity';
import { CreateMasterBrandDto } from './dto/create-master-brand.dto';
import { ListMasterBrandsQueryDto } from './dto/list-master-brands-query.dto';
import { UpdateMasterBrandDto } from './dto/update-master-brand.dto';

export type MasterBrandAdminRow = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  industryId: string | null;
  industryName: string | null;
  status: string;
  createdAt: string;
};

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 240);
}

@Injectable()
export class MasterBrandsService {
  constructor(
    @InjectRepository(MasterBrand) private readonly masterBrandRepo: Repository<MasterBrand>,
    @InjectRepository(Industry) private readonly industryRepo: Repository<Industry>,
  ) {}

  private toRow(row: MasterBrand): MasterBrandAdminRow {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl,
      industryId: row.industryId,
      industryName: row.industry?.name ?? null,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async assertIndustryExists(industryId: string | null | undefined): Promise<void> {
    if (industryId == null || industryId === '') return;
    const ind = await this.industryRepo.findOne({ where: { industryId } });
    if (!ind) throw new BadRequestException('Industry not found.');
  }

  private async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const qb = this.masterBrandRepo
      .createQueryBuilder('mb')
      .where('LOWER(mb.slug) = LOWER(:slug)', { slug });
    if (excludeId) {
      qb.andWhere('mb.id != :id', { id: excludeId });
    }
    return (await qb.getCount()) > 0;
  }

  async list(query: ListMasterBrandsQueryDto): Promise<{ success: true; data: MasterBrandAdminRow[] }> {
    const qb = this.masterBrandRepo
      .createQueryBuilder('mb')
      .leftJoinAndSelect('mb.industry', 'ind')
      .orderBy('mb.name', 'ASC');

    const q = query.search?.trim();
    if (q) {
      qb.andWhere('(LOWER(mb.name) LIKE LOWER(:q) OR LOWER(mb.slug) LIKE LOWER(:q))', {
        q: `%${q}%`,
      });
    }
    if (query.status === 'active' || query.status === 'inactive') {
      qb.andWhere('mb.status = :st', { st: query.status });
    }

    const rows = await qb.getMany();
    return { success: true, data: rows.map((r) => this.toRow(r)) };
  }

  async findOne(id: string): Promise<{ success: true; data: MasterBrandAdminRow }> {
    const row = await this.masterBrandRepo.findOne({
      where: { id },
      relations: { industry: true },
    });
    if (!row) throw new NotFoundException('Master brand not found.');
    return { success: true, data: this.toRow(row) };
  }

  async create(dto: CreateMasterBrandDto): Promise<{ success: true; data: MasterBrandAdminRow }> {
    const name = dto.name.trim();
    const baseSlug = (dto.slug?.trim() || slugify(name)) || slugify(name);
    if (!baseSlug) throw new BadRequestException('Could not derive slug from name.');

    const industryId =
      dto.industryId === undefined || dto.industryId === null || dto.industryId === ''
        ? null
        : dto.industryId;
    await this.assertIndustryExists(industryId ?? undefined);

    let slug = baseSlug;
    for (let i = 0; i < 20; i += 1) {
      if (!(await this.isSlugTaken(slug))) break;
      slug = `${baseSlug}-${i + 2}`;
    }

    const row = this.masterBrandRepo.create({
      name,
      slug,
      logoUrl: dto.logoUrl?.trim() || null,
      industryId,
      status: dto.status === 'inactive' ? 'inactive' : 'active',
    });

    try {
      const saved = await this.masterBrandRepo.save(row);
      const full = await this.masterBrandRepo.findOne({
        where: { id: saved.id },
        relations: { industry: true },
      });
      return { success: true, data: this.toRow(full!) };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('duplicate') || msg.includes('unique')) {
        throw new ConflictException('Master brand slug already exists.');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateMasterBrandDto): Promise<{ success: true; data: MasterBrandAdminRow }> {
    const row = await this.masterBrandRepo.findOne({
      where: { id },
      relations: { industry: true },
    });
    if (!row) throw new NotFoundException('Master brand not found.');

    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.logoUrl !== undefined) {
      row.logoUrl = dto.logoUrl === null || dto.logoUrl === '' ? null : dto.logoUrl.trim();
    }
    if (dto.status !== undefined) {
      row.status = dto.status === 'inactive' ? 'inactive' : 'active';
    }

    if (dto.industryId !== undefined) {
      const next =
        dto.industryId === null || dto.industryId === '' ? null : String(dto.industryId).trim();
      await this.assertIndustryExists(next);
      row.industryId = next;
    }

    if (dto.slug !== undefined) {
      const next = dto.slug.trim();
      if (!next) throw new BadRequestException('Slug cannot be empty.');
      if (await this.isSlugTaken(next, id)) {
        throw new ConflictException('Master brand slug already exists.');
      }
      row.slug = next;
    }

    try {
      await this.masterBrandRepo.save(row);
      const full = await this.masterBrandRepo.findOne({
        where: { id },
        relations: { industry: true },
      });
      return { success: true, data: this.toRow(full!) };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('duplicate') || msg.includes('unique')) {
        throw new ConflictException('Master brand slug already exists.');
      }
      throw e;
    }
  }

  /**
   * Removes the platform row. Tenant `brands.master_brand_id` FK uses ON DELETE SET NULL
   * (shadow rows remain without a master link).
   */
  async remove(id: string): Promise<{ success: true; data: { deleted: true } }> {
    const res = await this.masterBrandRepo.delete({ id });
    if (!res.affected) throw new NotFoundException('Master brand not found.');
    return { success: true, data: { deleted: true } };
  }
}
