import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageObject } from '../../common/entities/storage-object.entity';
import {
  MediaStorageBreakdownDto,
  MediaStorageOwnershipUsageDto,
  MediaStorageProviderUsageDto,
  MediaStorageUsageResponseDto,
} from './dto/media-storage-usage-response.dto';

type SummaryRow = {
  total_bytes?: string | null;
  active_bytes?: string | null;
  deleted_bytes?: string | null;
  total_objects?: string | number | null;
  active_objects?: string | number | null;
  deleted_objects?: string | number | null;
  platform_active_bytes?: string | null;
  platform_active_objects?: string | number | null;
  tenant_active_bytes?: string | null;
  tenant_active_objects?: string | number | null;
};

type BreakdownRow = {
  key?: string | null;
  active_bytes?: string | null;
  active_objects?: string | number | null;
};

type ProviderRow = {
  provider_id?: string | null;
  provider_name?: string | null;
  provider_type?: string | null;
  provider_status?: string | null;
  is_default?: boolean | null;
  health_status?: string | null;
  last_checked_at?: Date | string | null;
  active_bytes?: string | null;
  active_objects?: string | number | null;
  deleted_bytes?: string | null;
  deleted_objects?: string | number | null;
};

const FILE_TYPE_LABELS: Record<string, string> = {
  images: 'Images',
  pdf: 'PDF',
  zip: 'ZIP',
  other: 'Other',
};

@Injectable()
export class MediaStorageUsageService {
  constructor(
    @InjectRepository(StorageObject)
    private readonly storageObjects: Repository<StorageObject>,
  ) {}

  async getUsage(): Promise<MediaStorageUsageResponseDto> {
    const [summaryRows, fileTypeRows, categoryRows, providerRows] =
      await Promise.all([
        this.storageObjects.query(this.summarySql()),
        this.storageObjects.query(this.fileTypeSql()),
        this.storageObjects.query(this.categorySql()),
        this.storageObjects.query(this.providerSql()),
      ]);

    const summary = (summaryRows[0] ?? {}) as SummaryRow;
    return {
      semantics: {
        source: 'storage_objects_registry',
        scope: 'PLATFORM_WIDE',
        physicalProviderUsage: false,
        activeUsageExcludesDeleted: true,
      },
      summary: {
        totalBytes: this.bytes(summary.total_bytes),
        activeBytes: this.bytes(summary.active_bytes),
        deletedBytes: this.bytes(summary.deleted_bytes),
        totalObjects: this.count(summary.total_objects),
        activeObjects: this.count(summary.active_objects),
        deletedObjects: this.count(summary.deleted_objects),
      },
      byOwnership: this.ownership(summary),
      byFileType: (fileTypeRows as BreakdownRow[]).map((row) =>
        this.breakdown(row, FILE_TYPE_LABELS[row.key ?? ''] ?? 'Other'),
      ),
      byCategory: (categoryRows as BreakdownRow[]).map((row) =>
        this.breakdown(row, this.categoryLabel(row.key)),
      ),
      byProvider: (providerRows as ProviderRow[]).map((row) =>
        this.provider(row),
      ),
      quota: {
        configured: false,
        limitBytes: null,
        remainingBytes: null,
        percentageUsed: null,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private ownership(summary: SummaryRow): MediaStorageOwnershipUsageDto[] {
    return [
      {
        ownershipType: 'PLATFORM',
        activeBytes: this.bytes(summary.platform_active_bytes),
        activeObjects: this.count(summary.platform_active_objects),
      },
      {
        ownershipType: 'TENANT',
        activeBytes: this.bytes(summary.tenant_active_bytes),
        activeObjects: this.count(summary.tenant_active_objects),
      },
    ];
  }

  private breakdown(
    row: BreakdownRow,
    label: string,
  ): MediaStorageBreakdownDto {
    return {
      key: row.key?.trim() || 'other',
      label,
      activeBytes: this.bytes(row.active_bytes),
      activeObjects: this.count(row.active_objects),
    };
  }

  private provider(row: ProviderRow): MediaStorageProviderUsageDto {
    return {
      providerId: row.provider_id ?? null,
      providerName: row.provider_name ?? 'Unassigned / legacy local storage',
      providerType: row.provider_type ?? null,
      status: row.provider_status ?? null,
      isDefault: row.is_default === true,
      healthStatus: row.health_status ?? 'UNKNOWN',
      lastCheckedAt: this.iso(row.last_checked_at),
      activeBytes: this.bytes(row.active_bytes),
      activeObjects: this.count(row.active_objects),
      deletedBytes: this.bytes(row.deleted_bytes),
      deletedObjects: this.count(row.deleted_objects),
    };
  }

  private bytes(value: string | null | undefined): string {
    const normalized = value?.trim() || '0';
    return /^\d+$/.test(normalized) ? normalized : '0';
  }

  private count(value: string | number | null | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
  }

  private iso(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private categoryLabel(value: string | null | undefined): string {
    const key = value?.trim() || 'other';
    return key
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private summarySql(): string {
    return `
      SELECT
        COALESCE(SUM(COALESCE(size_bytes, 0)), 0)::text AS total_bytes,
        COALESCE(SUM(COALESCE(size_bytes, 0)) FILTER (WHERE status = 'ACTIVE'), 0)::text AS active_bytes,
        COALESCE(SUM(COALESCE(size_bytes, 0)) FILTER (WHERE status = 'DELETED'), 0)::text AS deleted_bytes,
        COUNT(*)::text AS total_objects,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::text AS active_objects,
        COUNT(*) FILTER (WHERE status = 'DELETED')::text AS deleted_objects,
        COALESCE(SUM(COALESCE(size_bytes, 0)) FILTER (
          WHERE status = 'ACTIVE' AND ownership_type = 'PLATFORM'
        ), 0)::text AS platform_active_bytes,
        COUNT(*) FILTER (
          WHERE status = 'ACTIVE' AND ownership_type = 'PLATFORM'
        )::text AS platform_active_objects,
        COALESCE(SUM(COALESCE(size_bytes, 0)) FILTER (
          WHERE status = 'ACTIVE' AND ownership_type = 'TENANT'
        ), 0)::text AS tenant_active_bytes,
        COUNT(*) FILTER (
          WHERE status = 'ACTIVE' AND ownership_type = 'TENANT'
        )::text AS tenant_active_objects
      FROM storage_objects
    `;
  }

  private fileTypeSql(): string {
    return `
      SELECT
        CASE
          WHEN LOWER(COALESCE(mime_type, '')) LIKE 'image/%'
            AND LOWER(COALESCE(mime_type, '')) <> 'image/svg+xml' THEN 'images'
          WHEN LOWER(COALESCE(mime_type, '')) = 'application/pdf' THEN 'pdf'
          WHEN LOWER(COALESCE(mime_type, '')) IN (
            'application/zip',
            'application/x-zip-compressed'
          ) THEN 'zip'
          ELSE 'other'
        END AS key,
        COUNT(*)::text AS active_objects,
        COALESCE(SUM(COALESCE(size_bytes, 0)), 0)::text AS active_bytes
      FROM storage_objects
      WHERE status = 'ACTIVE'
      GROUP BY 1
      ORDER BY SUM(COALESCE(size_bytes, 0)) DESC, key ASC
    `;
  }

  private categorySql(): string {
    return `
      SELECT
        COALESCE(NULLIF(object_category, ''), 'other') AS key,
        COUNT(*)::text AS active_objects,
        COALESCE(SUM(COALESCE(size_bytes, 0)), 0)::text AS active_bytes
      FROM storage_objects
      WHERE status = 'ACTIVE'
      GROUP BY 1
      ORDER BY SUM(COALESCE(size_bytes, 0)) DESC, key ASC
      LIMIT 50
    `;
  }

  private providerSql(): string {
    return `
      SELECT
        provider.id AS provider_id,
        provider.name AS provider_name,
        provider.type AS provider_type,
        provider.status AS provider_status,
        provider.is_default,
        provider.health_status,
        provider.last_checked_at,
        COUNT(object.id) FILTER (WHERE object.status = 'ACTIVE')::text AS active_objects,
        COALESCE(SUM(COALESCE(object.size_bytes, 0)) FILTER (
          WHERE object.status = 'ACTIVE'
        ), 0)::text AS active_bytes,
        COUNT(object.id) FILTER (WHERE object.status = 'DELETED')::text AS deleted_objects,
        COALESCE(SUM(COALESCE(object.size_bytes, 0)) FILTER (
          WHERE object.status = 'DELETED'
        ), 0)::text AS deleted_bytes
      FROM platform_storage_providers provider
      FULL OUTER JOIN storage_objects object
        ON object.provider_id = provider.id
      GROUP BY
        provider.id,
        provider.name,
        provider.type,
        provider.status,
        provider.is_default,
        provider.health_status,
        provider.last_checked_at
      ORDER BY
        provider.is_default DESC NULLS LAST,
        COALESCE(SUM(COALESCE(object.size_bytes, 0)) FILTER (
          WHERE object.status = 'ACTIVE'
        ), 0) DESC
    `;
  }
}
