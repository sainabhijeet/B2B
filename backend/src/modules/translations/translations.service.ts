import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Translation } from '../../common/entities/translation.entity';
import { PLATFORM_ROLES } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { ListTranslationsQueryDto } from './dto/list-translations-query.dto';
import { UpsertTranslationDto } from './dto/upsert-translation.dto';

@Injectable()
export class TranslationsService {
  constructor(
    @InjectRepository(Translation)
    private readonly translationsRepo: Repository<Translation>,
  ) {}

  async list(user: JwtUserPayload, query: ListTranslationsQueryDto) {
    const qb = this.translationsRepo.createQueryBuilder('t');
    if (PLATFORM_ROLES.includes(user.role)) {
      qb.where('1=1');
    } else {
      if (!user.tenantId)
        throw new ForbiddenException('Tenant context required.');
      qb.where('(t.tenant_id IS NULL OR t.tenant_id = :tenantId)', {
        tenantId: user.tenantId,
      });
    }
    if (query.languageCode) {
      qb.andWhere('t.language_code = :languageCode', {
        languageCode: query.languageCode,
      });
    }
    qb.orderBy('t.created_at', 'DESC');
    const data = await qb.getMany();
    return { success: true, data, meta: {}, message: '' };
  }

  async upsert(user: JwtUserPayload, dto: UpsertTranslationDto) {
    const tenantId = PLATFORM_ROLES.includes(user.role) ? null : user.tenantId;
    if (!PLATFORM_ROLES.includes(user.role) && !tenantId)
      throw new ForbiddenException('Tenant context required.');

    const languageCode = dto.languageCode ?? 'en';
    let row = await this.translationsRepo.findOne({
      where: {
        tenantId: tenantId ?? IsNull(),
        languageCode,
        translationKey: dto.translationKey,
      } as any,
    });
    if (!row) {
      row = this.translationsRepo.create({
        tenantId,
        languageCode,
        translationKey: dto.translationKey,
        translationValue: dto.translationValue,
        status: dto.status ?? 'active',
      });
    } else {
      row.translationValue = dto.translationValue;
      row.status = dto.status ?? row.status;
    }
    const saved = await this.translationsRepo.save(row);
    return { success: true, data: saved, meta: {}, message: '' };
  }

  entityKey(entity: string, identifier: string, field: string): string {
    return [entity, identifier, field]
      .map((part) =>
        String(part)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9._-]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      )
      .filter(Boolean)
      .join('.');
  }

  async translateRuntimeText(
    tenantId: string,
    languageCode: string | null | undefined,
    fallbackText: string | null | undefined,
    candidateKeys: string[] = [],
  ): Promise<string> {
    const resolvedLanguage = this.normalizeLanguage(languageCode);
    const fallback = fallbackText ?? '';
    if (resolvedLanguage === 'en') return fallback;

    const keys = this.uniqueKeys([
      ...candidateKeys,
      fallback,
    ]);
    if (!keys.length) return fallback;

    const row = await this.findBestTranslation(tenantId, resolvedLanguage, keys);
    return row?.translationValue?.trim() ? row.translationValue : fallback;
  }

  async translateRuntimeDictionary(
    tenantId: string,
    languageCode: string | null | undefined,
    sources: unknown[],
  ): Promise<Record<string, string>> {
    const resolvedLanguage = this.normalizeLanguage(languageCode);
    const keys = this.uniqueKeys(this.collectRuntimeStrings(sources));
    if (!keys.length || resolvedLanguage === 'en') return {};

    const rows = await this.translationsRepo
      .createQueryBuilder('t')
      .where('t.language_code = :languageCode', { languageCode: resolvedLanguage })
      .andWhere('t.status = :status', { status: 'active' })
      .andWhere('t.translation_key IN (:...keys)', { keys })
      .andWhere('(t.tenant_id IS NULL OR t.tenant_id = :tenantId)', { tenantId })
      .orderBy('CASE WHEN t.tenant_id = :tenantId THEN 0 ELSE 1 END', 'ASC')
      .getMany();

    const dictionary: Record<string, string> = {};
    for (const row of rows) {
      if (!dictionary[row.translationKey] && row.translationValue?.trim()) {
        dictionary[row.translationKey] = row.translationValue;
      }
    }
    return dictionary;
  }

  private async findBestTranslation(
    tenantId: string,
    languageCode: string,
    keys: string[],
  ): Promise<Translation | null> {
    return this.translationsRepo
      .createQueryBuilder('t')
      .where('t.language_code = :languageCode', { languageCode })
      .andWhere('t.status = :status', { status: 'active' })
      .andWhere('t.translation_key IN (:...keys)', { keys })
      .andWhere('(t.tenant_id IS NULL OR t.tenant_id = :tenantId)', { tenantId })
      .orderBy('CASE WHEN t.tenant_id = :tenantId THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy(`array_position(ARRAY[:...keys]::varchar[], t.translation_key)`, 'ASC')
      .getOne();
  }

  private normalizeLanguage(languageCode: string | null | undefined): string {
    const normalized = languageCode?.trim().toLowerCase();
    return normalized || 'en';
  }

  private uniqueKeys(keys: string[]): string[] {
    return [
      ...new Set(
        keys
          .map((key) => key.trim())
          .filter((key) => key.length > 0 && key.length <= 255),
      ),
    ];
  }

  private collectRuntimeStrings(value: unknown): string[] {
    if (typeof value === 'string') {
      const text = value.trim();
      return this.shouldTranslateRuntimeString(text) ? [text] : [];
    }
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.collectRuntimeStrings(item));
    }
    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        this.shouldSkipRuntimeKey(key) ? [] : this.collectRuntimeStrings(child),
      );
    }
    return [];
  }

  private shouldSkipRuntimeKey(key: string): boolean {
    return [
      'id',
      'slug',
      'sku',
      'url',
      'href',
      'image',
      'imageUrl',
      'thumbnailUrl',
      'logo',
      'logoUrl',
      'assetBaseUrl',
    ].includes(key);
  }

  private shouldTranslateRuntimeString(value: string): boolean {
    if (!value) return false;
    if (/^(?:https?:)?\/\//iu.test(value) || value.startsWith('data:')) return false;
    if (/^#(?:[0-9a-f]{3}){1,2}$/iu.test(value)) return false;
    if (/\.(?:png|jpe?g|webp|gif|svg|avif|json|css|js)(?:[?#].*)?$/iu.test(value)) {
      return false;
    }
    return true;
  }
}
