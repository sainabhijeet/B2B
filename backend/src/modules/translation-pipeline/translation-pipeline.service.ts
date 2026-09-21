import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { DataSource, In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Theme } from '../../common/entities/theme.entity';
import {
  PLATFORM_ROLES,
  TENANT_STAFF_ROLES,
} from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { getBackendStorageRoot } from '../../common/utils/storage-root';
import { ThemeTranslationAuditEvent } from './entities/translation-audit-event.entity';
import { ThemeTranslationEntry } from './entities/translation-entry.entity';
import { ThemeTranslationJob } from './entities/translation-job.entity';
import { ThemeTranslationRevision } from './entities/translation-revision.entity';
import {
  TRANSLATION_AI_PROVIDER,
  TranslationAiProvider,
} from './translation-provider.types';
import { TranslationQueueService } from './translation-queue.service';
import { CreateTranslationJobDto } from './dto/create-translation-job.dto';
import { ImportLocaleDto } from './dto/import-locale.dto';
import { ListTranslationJobsDto } from './dto/list-translation-jobs.dto';
import { ReviewTranslationDto } from './dto/review-translation.dto';

type SourceEntry = { key: string; text: string };

@Injectable()
export class TranslationPipelineService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly queue: TranslationQueueService,
    @InjectRepository(Theme) private readonly themes: Repository<Theme>,
    @InjectRepository(ThemeTranslationJob)
    private readonly jobs: Repository<ThemeTranslationJob>,
    @InjectRepository(ThemeTranslationEntry)
    private readonly entries: Repository<ThemeTranslationEntry>,
    @InjectRepository(ThemeTranslationRevision)
    private readonly revisions: Repository<ThemeTranslationRevision>,
    @InjectRepository(ThemeTranslationAuditEvent)
    private readonly events: Repository<ThemeTranslationAuditEvent>,
    @Inject(TRANSLATION_AI_PROVIDER)
    private readonly provider: TranslationAiProvider,
  ) {}

  private enabled(): void {
    if (this.config.get<boolean>('translationPipeline.enabled') !== true)
      throw new ForbiddenException('Translation pipeline is disabled.');
  }

  private reviewEnabled(): void {
    if (this.config.get<boolean>('translationPipeline.reviewEnabled') !== true)
      throw new ForbiddenException('Translation review is disabled.');
  }

  private canRead(user: JwtUserPayload, tenantId: string | null): void {
    if (PLATFORM_ROLES.includes(user.role)) return;
    if (!tenantId || user.tenantId !== tenantId)
      throw new ForbiddenException('Tenant context required.');
  }

  private canReview(user: JwtUserPayload): void {
    if (![...PLATFORM_ROLES, ...TENANT_STAFF_ROLES].includes(user.role))
      throw new ForbiddenException('Translation review permission required.');
  }

  async createJob(user: JwtUserPayload, dto: CreateTranslationJobDto) {
    this.enabled();
    const theme = await this.themes.findOne({ where: { id: dto.themeId } });
    if (!theme) throw new NotFoundException('Theme not found.');
    this.canRead(user, user.tenantId ?? null);
    const sourceLanguage = (dto.sourceLanguage ?? 'en')
      .trim()
      .toLowerCase()
      .split('-')[0];
    const targetLanguages = [
      ...new Set(
        dto.targetLanguages
          .map((x) => x.trim().toLowerCase().split('-')[0])
          .filter((x) => x && x !== sourceLanguage),
      ),
    ];
    if (!targetLanguages.length)
      throw new BadRequestException(
        'At least one target language is required.',
      );
    const sources = await this.auditTheme(theme);
    const max =
      this.config.get<number>('translationPipeline.maxEntriesPerJob') ?? 10000;
    if (sources.length > max)
      throw new BadRequestException(
        `Theme contains more than ${max} translatable entries.`,
      );
    const job = await this.dataSource.transaction(async (manager) => {
      const created = await manager.getRepository(ThemeTranslationJob).save(
        manager.getRepository(ThemeTranslationJob).create({
          tenantId: user.tenantId ?? null,
          themeId: theme.id,
          themeVersion: dto.themeVersion ?? theme.themeVersion ?? null,
          sourceLanguage,
          targetLanguages,
          status: 'QUEUED',
          requestedBy: user.sub ?? null,
          entryCount: sources.length * targetLanguages.length,
          approvedCount: 0,
          metadataJson: {
            sourceCount: sources.length,
            provider: this.provider.name,
          },
        }),
      );
      const previous = await manager.getRepository(ThemeTranslationEntry).find({
        where: {
          themeId: theme.id,
          languageCode: In(targetLanguages),
          status: 'APPROVED',
        },
      });
      const previousByKey = new Map(
        previous.map((entry) => [
          `${entry.languageCode}:${entry.translationKey}`,
          entry,
        ]),
      );
      const rows = targetLanguages.flatMap((languageCode) =>
        sources.map((source) => {
          const approved = previousByKey.get(`${languageCode}:${source.key}`);
          return manager.getRepository(ThemeTranslationEntry).create({
            jobId: created.id,
            themeId: theme.id,
            languageCode,
            translationKey: source.key,
            sourceText: source.text,
            approvedText: approved?.approvedText ?? null,
            draftText: null,
            status: approved ? 'APPROVED' : 'MISSING',
            draftProvider: null,
            draftVersion: 0,
            lockVersion: 1,
          });
        }),
      );
      await manager
        .getRepository(ThemeTranslationEntry)
        .save(rows, { chunk: 250 });
      await manager.getRepository(ThemeTranslationAuditEvent).save(
        manager.getRepository(ThemeTranslationAuditEvent).create({
          jobId: created.id,
          action: 'JOB_CREATED',
          actorId: user.sub ?? null,
          payloadJson: { sourceCount: sources.length, targetLanguages },
        }),
      );
      return created;
    });
    await this.queue.enqueue(job.id);
    return this.detail(user, job.id);
  }

  async list(user: JwtUserPayload, query: ListTranslationJobsDto) {
    this.enabled();
    const qb = this.jobs.createQueryBuilder('job');
    if (!PLATFORM_ROLES.includes(user.role))
      qb.where('job.tenant_id = :tenantId', { tenantId: user.tenantId });
    if (query.status)
      qb.andWhere('job.status = :status', { status: query.status });
    if (query.themeId)
      qb.andWhere('job.theme_id = :themeId', { themeId: query.themeId });
    return {
      success: true,
      data: await qb.orderBy('job.created_at', 'DESC').getMany(),
      meta: {},
      message: '',
    };
  }

  async detail(user: JwtUserPayload, jobId: string) {
    this.enabled();
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Translation job not found.');
    this.canRead(user, job.tenantId);
    const entries = await this.entries.find({
      where: { jobId },
      order: { languageCode: 'ASC', translationKey: 'ASC' },
    });
    const coverage = this.coverage(entries, job.targetLanguages);
    return {
      success: true,
      data: { job, entries, coverage },
      meta: {},
      message: '',
    };
  }

  async process(jobId: string): Promise<void> {
    if (
      this.config.get<boolean>('translationPipeline.enabled') !== true ||
      this.config.get<boolean>('translationPipeline.aiDraftsEnabled') !== true
    )
      return;
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job || ['PUBLISHED', 'CANCELLED'].includes(job.status)) return;
    await this.jobs.update(
      { id: jobId },
      { status: 'DRAFTING', errorMessage: null },
    );
    try {
      const rows = await this.entries.find({
        where: { jobId, status: In(['MISSING', 'REJECTED']) },
      });
      for (const entry of rows) {
        const draft = await this.provider.translate({
          sourceLanguage: job.sourceLanguage,
          targetLanguage: entry.languageCode,
          key: entry.translationKey,
          sourceText: entry.sourceText,
        });
        await this.dataSource.transaction(async (manager) => {
          const repo = manager.getRepository(ThemeTranslationEntry);
          const current = await repo.findOne({ where: { id: entry.id } });
          if (!current || current.status === 'APPROVED') return;
          const nextVersion = current.draftVersion + 1;
          const result = await repo
            .createQueryBuilder()
            .update()
            .set({
              draftText: draft.value,
              draftProvider: draft.provider,
              draftVersion: nextVersion,
              status: 'DRAFT',
              lockVersion: current.lockVersion + 1,
            })
            .where(
              'id = :id AND lock_version = :lockVersion AND status <> :approved',
              {
                id: current.id,
                lockVersion: current.lockVersion,
                approved: 'APPROVED',
              },
            )
            .execute();
          if (result.affected !== 1)
            throw new BadRequestException(
              'Translation entry changed concurrently.',
            );
          await manager.getRepository(ThemeTranslationRevision).save(
            manager.getRepository(ThemeTranslationRevision).create({
              entryId: current.id,
              version: nextVersion,
              translationText: draft.value,
              status: 'DRAFT',
              provider: draft.provider,
              createdBy: null,
              reviewedBy: null,
              reviewNote: (draft.warnings ?? []).join(' ') || null,
            }),
          );
          await manager.getRepository(ThemeTranslationAuditEvent).save(
            manager.getRepository(ThemeTranslationAuditEvent).create({
              jobId,
              entryId: current.id,
              action: 'AI_DRAFT_CREATED',
              actorId: null,
              payloadJson: {
                provider: draft.provider,
                warnings: draft.warnings ?? [],
              },
            }),
          );
        });
      }
      await this.jobs.update({ id: jobId }, { status: 'REVIEW' });
    } catch (error) {
      await this.jobs.update(
        { id: jobId },
        {
          status: 'FAILED',
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Translation drafting failed.',
        },
      );
    }
  }

  async review(
    user: JwtUserPayload,
    entryId: string,
    dto: ReviewTranslationDto,
  ) {
    this.enabled();
    this.reviewEnabled();
    this.canReview(user);
    const entry = await this.entries.findOne({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Translation entry not found.');
    const job = await this.jobs.findOne({ where: { id: entry.jobId } });
    if (!job) throw new NotFoundException('Translation job not found.');
    this.canRead(user, job.tenantId);
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ThemeTranslationEntry);
      const current = await repo.findOne({ where: { id: entryId } });
      if (!current) throw new NotFoundException('Translation entry not found.');
      if (current.status === 'APPROVED' && dto.decision !== 'APPROVED')
        throw new BadRequestException(
          'Approved translations cannot be rejected or overwritten.',
        );
      const version = current.draftVersion + 1;
      const saved = await repo.save({
        ...current,
        draftText: dto.translationText,
        status: dto.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        approvedText:
          dto.decision === 'APPROVED'
            ? dto.translationText
            : current.approvedText,
        draftVersion: version,
        lockVersion: current.lockVersion + 1,
      });
      await manager.getRepository(ThemeTranslationRevision).save(
        manager.getRepository(ThemeTranslationRevision).create({
          entryId,
          version,
          translationText: dto.translationText,
          status: dto.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          provider: 'human',
          createdBy: user.sub ?? null,
          reviewedBy: user.sub ?? null,
          reviewNote: dto.note ?? null,
        }),
      );
      await manager.getRepository(ThemeTranslationAuditEvent).save(
        manager.getRepository(ThemeTranslationAuditEvent).create({
          jobId: entry.jobId,
          entryId,
          action:
            dto.decision === 'APPROVED'
              ? 'TRANSLATION_APPROVED'
              : 'TRANSLATION_REJECTED',
          actorId: user.sub ?? null,
          payloadJson: { version, note: dto.note ?? null },
        }),
      );
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async publish(user: JwtUserPayload, jobId: string) {
    this.enabled();
    this.reviewEnabled();
    this.canReview(user);
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Translation job not found.');
    this.canRead(user, job.tenantId);
    const entries = await this.entries.find({ where: { jobId } });
    const incomplete = entries.filter(
      (entry) => entry.status !== 'APPROVED' || !entry.approvedText,
    );
    if (incomplete.length)
      throw new BadRequestException(
        `${incomplete.length} translations require human approval before publish.`,
      );
    const saved = await this.jobs.save({
      ...job,
      status: 'PUBLISHED',
      approvedCount: entries.length,
    });
    await this.events.save(
      this.events.create({
        jobId,
        action: 'TRANSLATION_JOB_PUBLISHED',
        actorId: user.sub ?? null,
        payloadJson: { count: entries.length },
      }),
    );
    return {
      success: true,
      data: { job: saved, locales: this.exportLocales(entries) },
      meta: {},
      message: '',
    };
  }

  async bulkReview(
    user: JwtUserPayload,
    dto: { entryIds: string[]; translationText: string },
  ) {
    this.enabled();
    this.reviewEnabled();
    this.canReview(user);
    const results = [];
    for (const entryId of [...new Set(dto.entryIds)]) {
      results.push(
        await this.review(user, entryId, {
          decision: 'APPROVED',
          translationText: dto.translationText,
          note: 'Bulk human review.',
        }),
      );
    }
    return {
      success: true,
      data: { reviewed: results.length },
      meta: {},
      message: '',
    };
  }

  async importLocale(
    user: JwtUserPayload,
    jobId: string,
    dto: ImportLocaleDto,
  ) {
    this.enabled();
    this.reviewEnabled();
    this.canReview(user);
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Translation job not found.');
    this.canRead(user, job.tenantId);
    const rows = await this.entries.find({
      where: { jobId, languageCode: dto.languageCode.trim().toLowerCase() },
    });
    let imported = 0;
    for (const entry of rows) {
      const value = dto.dictionary[entry.translationKey];
      if (
        typeof value !== 'string' ||
        !value.trim() ||
        entry.status === 'APPROVED'
      )
        continue;
      await this.dataSource.transaction(async (manager) => {
        const nextVersion = entry.draftVersion + 1;
        await manager.getRepository(ThemeTranslationEntry).update(
          { id: entry.id },
          {
            draftText: value,
            draftProvider: 'locale-import',
            draftVersion: nextVersion,
            status: 'DRAFT',
            lockVersion: entry.lockVersion + 1,
          },
        );
        await manager.getRepository(ThemeTranslationRevision).save(
          manager.getRepository(ThemeTranslationRevision).create({
            entryId: entry.id,
            version: nextVersion,
            translationText: value,
            status: 'DRAFT',
            provider: 'locale-import',
            createdBy: user.sub ?? null,
            reviewedBy: null,
            reviewNote: 'Imported locale draft; human approval required.',
          }),
        );
        await manager.getRepository(ThemeTranslationAuditEvent).save(
          manager.getRepository(ThemeTranslationAuditEvent).create({
            jobId,
            entryId: entry.id,
            action: 'LOCALE_IMPORTED_AS_DRAFT',
            actorId: user.sub ?? null,
            payloadJson: { languageCode: dto.languageCode },
          }),
        );
      });
      imported += 1;
    }
    return { success: true, data: { imported }, meta: {}, message: '' };
  }

  async export(user: JwtUserPayload, jobId: string) {
    const details = await this.detail(user, jobId);
    const entries = (details.data as { entries: ThemeTranslationEntry[] })
      .entries;
    return {
      success: true,
      data: this.exportLocales(entries),
      meta: {},
      message: '',
    };
  }

  async history(user: JwtUserPayload, entryId: string) {
    this.enabled();
    const entry = await this.entries.findOne({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Translation entry not found.');
    const job = await this.jobs.findOne({ where: { id: entry.jobId } });
    if (!job) throw new NotFoundException('Translation job not found.');
    this.canRead(user, job.tenantId);
    return {
      success: true,
      data: await this.revisions.find({
        where: { entryId },
        order: { version: 'DESC' },
      }),
      meta: {},
      message: '',
    };
  }

  async metrics(user: JwtUserPayload) {
    this.enabled();
    const jobs = await this.list(user, {});
    const jobRows = jobs.data as ThemeTranslationJob[];
    const entries = jobRows.length
      ? await this.entries.find({
          where: { jobId: In(jobRows.map((job) => job.id)) },
        })
      : [];
    return {
      success: true,
      data: {
        jobs: jobRows.length,
        entries: entries.length,
        drafts: entries.filter((x) => x.status === 'DRAFT').length,
        approved: entries.filter((x) => x.status === 'APPROVED').length,
        coverage: entries.length
          ? Math.round(
              (entries.filter((x) => x.status === 'APPROVED').length /
                entries.length) *
                100,
            )
          : 0,
      },
      meta: {},
      message: '',
    };
  }

  private coverage(entries: ThemeTranslationEntry[], languages: string[]) {
    const total = entries.length;
    const approved = entries.filter(
      (entry) => entry.status === 'APPROVED' && entry.approvedText,
    ).length;
    return {
      total,
      approved,
      missing: total - approved,
      completeness: total ? Math.round((approved / total) * 100) : 0,
      languages,
      readyForPublish: total > 0 && approved === total,
    };
  }

  private exportLocales(entries: ThemeTranslationEntry[]) {
    return entries.reduce<Record<string, Record<string, string>>>(
      (out, entry) => {
        if (entry.status !== 'APPROVED' || !entry.approvedText) return out;
        (out[entry.languageCode] ??= {})[entry.translationKey] =
          entry.approvedText;
        return out;
      },
      {},
    );
  }

  private async auditTheme(theme: Theme): Promise<SourceEntry[]> {
    const relative = (theme.storagePath ?? '')
      .replace(/^[/\\]+/, '')
      .replace(/[/\\]+/g, path.sep);
    if (!relative) return [];
    const root = path.resolve(getBackendStorageRoot(), relative);
    const storageRoot = path.resolve(getBackendStorageRoot());
    if (!root.startsWith(`${storageRoot}${path.sep}`))
      throw new BadRequestException(
        'Theme storage path is outside the storage root.',
      );
    const files = await this.jsonFiles(root);
    const found = new Map<string, string>();
    for (const file of files) {
      if (
        file.includes(`${path.sep}tokens${path.sep}`) ||
        file.includes(`${path.sep}locales${path.sep}`) ||
        file.endsWith(`${path.sep}theme.json`)
      )
        continue;
      try {
        const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as unknown;
        this.collectStrings(parsed, found);
      } catch {
        /* validation pipeline reports malformed JSON */
      }
    }
    return [...found.entries()].map(([key, text]) => ({ key, text }));
  }

  private async jsonFiles(root: string): Promise<string[]> {
    const output: string[] = [];
    for (const item of await fs.readdir(root, { withFileTypes: true })) {
      const full = path.join(root, item.name);
      if (item.isDirectory()) output.push(...(await this.jsonFiles(full)));
      else if (item.name.endsWith('.json')) output.push(full);
    }
    return output;
  }

  private collectStrings(value: unknown, target: Map<string, string>): void {
    if (typeof value === 'string') {
      const text = value.trim();
      if (
        text &&
        !/^(https?:\/\/|data:|assets[\\/]|#|linear-gradient|radial-gradient|var\(|\$?\d|\^\d)/iu.test(
          text,
        ) &&
        !/\.(json|css|js|svg|png|jpe?g|webp|gif)$/iu.test(text)
      )
        target.set(text, text);
    } else if (Array.isArray(value))
      value.forEach((item) => this.collectStrings(item, target));
    else if (value && typeof value === 'object')
      Object.values(value).forEach((item) => this.collectStrings(item, target));
  }
}
