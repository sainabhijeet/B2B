import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Industry } from '../../common/entities/industry.entity';
import { CreateIndustryDto } from './dto/create-industry.dto';
import { UpdateIndustryDto } from './dto/update-industry.dto';

export type IndustryResponse = {
  industryId: string;
  displayOrder: number;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'inactive';
  createdAt: string;
};

@Injectable()
export class IndustriesService {
  constructor(
    @InjectRepository(Industry)
    private readonly industryRepository: Repository<Industry>,
  ) {}

  private toResponse(row: Industry): IndustryResponse {
    return {
      industryId: row.industryId,
      displayOrder: row.displayOrder,
      name: row.name,
      description: row.description ?? '',
      icon: row.icon || 'Box',
      status: row.status === 'inactive' ? 'inactive' : 'active',
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Active industries for distributor onboarding / signup (no auth). */
  async listPublic(): Promise<IndustryResponse[]> {
    const rows = await this.industryRepository.find({
      where: { status: 'active' },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return rows.map((r) => this.toResponse(r));
  }

  async listAdmin(): Promise<IndustryResponse[]> {
    const rows = await this.industryRepository.find({
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return rows.map((r) => this.toResponse(r));
  }

  async create(dto: CreateIndustryDto): Promise<IndustryResponse> {
    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined || displayOrder === null) {
      const raw = await this.industryRepository
        .createQueryBuilder('i')
        .select('MAX(i.display_order)', 'max')
        .getRawOne<{ max: string | null }>();
      const max = raw?.max != null ? parseInt(String(raw.max), 10) : 0;
      displayOrder = Number.isFinite(max) ? max + 1 : 1;
    }
    const row = this.industryRepository.create({
      name: dto.name.trim(),
      description: (dto.description ?? '').trim(),
      icon: (dto.icon ?? 'Store').trim() || 'Box',
      status: dto.status ?? 'active',
      displayOrder,
    });
    const saved = await this.industryRepository.save(row);
    return this.toResponse(saved);
  }

  async update(industryId: string, dto: UpdateIndustryDto): Promise<IndustryResponse> {
    const row = await this.industryRepository.findOne({ where: { industryId } });
    if (!row) throw new NotFoundException('Industry not found.');
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.description !== undefined) row.description = dto.description.trim();
    if (dto.icon !== undefined) row.icon = dto.icon.trim() || 'Box';
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.displayOrder !== undefined) row.displayOrder = dto.displayOrder;
    const saved = await this.industryRepository.save(row);
    return this.toResponse(saved);
  }

  async remove(industryId: string): Promise<void> {
    const res = await this.industryRepository.delete({ industryId });
    if (!res.affected) throw new NotFoundException('Industry not found.');
  }
}
