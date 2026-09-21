import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SystemConfig } from '../../common/entities/system-config.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SetCatalogMediaConfigDto } from './dto/set-catalog-media-config.dto';
import { ListSystemConfigQueryDto } from './dto/list-system-config-query.dto';
import { SetSystemConfigDto } from './dto/set-system-config.dto';

export type SystemConfigListItem = {
  key: string;
  value: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async setConfig(dto: SetSystemConfigDto): Promise<SystemConfig> {
    let row = await this.configRepository.findOne({ where: { key: dto.key } });
    if (row) {
      row.value = dto.value ?? null;
    } else {
      row = this.configRepository.create({ key: dto.key, value: dto.value ?? null });
    }
    const saved = await this.configRepository.save(row);
    await this.auditLogsService.log({
      action: 'SYSTEM_CONFIG_UPDATED',
      metadata: { key: dto.key },
    });
    return saved;
  }

  async getConfig(key: string): Promise<SystemConfig | null> {
    return this.configRepository.findOne({ where: { key } });
  }

  async listConfigPage(query: ListSystemConfigQueryDto): Promise<{
    items: SystemConfigListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 500) : 100;
    const qb = this.configRepository.createQueryBuilder('c').orderBy('c.key', 'ASC');
    const p = query.prefix?.trim();
    if (p) {
      qb.andWhere('c.key LIKE :prefix', { prefix: `${p}%` });
    }
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return {
      items: items.map((row) => ({
        key: row.key,
        value: row.value,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async setCatalogMediaConfig(dto: SetCatalogMediaConfigDto) {
    const prefix = dto.tenantId ? `tenant:${dto.tenantId}` : 'catalog';
    const configs = [
      this.configRepository.create({
        key: `${prefix}:max_images_per_product`,
        value: String(dto.maxImagesPerProduct),
      }),
      this.configRepository.create({
        key: `${prefix}:max_image_size_mb`,
        value: String(dto.maxImageSizeMb),
      }),
      this.configRepository.create({
        key: `${prefix}:allowed_formats`,
        value: dto.allowedFormats.map((f) => f.toLowerCase()).join(','),
      }),
    ];

    const saved = await this.configRepository.save(configs);
    await this.auditLogsService.log({
      action: 'CATALOG_MEDIA_CONFIG_UPDATED',
      metadata: {
        scope: dto.tenantId ? 'tenant' : 'global',
        tenantId: dto.tenantId ?? null,
      },
    });

    return {
      success: true,
      data: saved,
      meta: {},
      message: 'Catalog media config updated',
    };
  }

  async getCatalogMediaConfig(tenantId?: string) {
    const prefix = tenantId ? `tenant:${tenantId}` : 'catalog';
    const keys = [
      `${prefix}:max_images_per_product`,
      `${prefix}:max_image_size_mb`,
      `${prefix}:allowed_formats`,
    ];
    const rows = await this.configRepository.find({
      where: { key: In(keys) },
    });
    const map = new Map(rows.map((row) => [row.key, row.value ?? '']));

    return {
      success: true,
      data: {
        tenantId: tenantId ?? null,
        maxImagesPerProduct: Number(map.get(`${prefix}:max_images_per_product`) || 10),
        maxImageSizeMb: Number(map.get(`${prefix}:max_image_size_mb`) || 2),
        allowedFormats: (map.get(`${prefix}:allowed_formats`) || 'jpg,jpeg,png,webp')
          .split(',')
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean),
      },
      meta: {},
      message: '',
    };
  }
}
