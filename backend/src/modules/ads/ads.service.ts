import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdCampaign } from '../../common/entities/ad-campaign.entity';
import { AdCreative } from '../../common/entities/ad-creative.entity';
import { AdStat } from '../../common/entities/ad-stat.entity';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { QUEUE_NAMES } from '../../workers/queues';
import { AppQueue, createAppQueue } from '../../workers/queue-factory';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateAdCreativeDto } from './dto/create-ad-creative.dto';
import { CreateAdDto } from './dto/create-ad.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { TrackAdEventDto } from './dto/track-ad-event.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

export type PublicAdPayload = {
  id: string;
  campaignId: string;
  title: string;
  placement: string;
  imageUrl: string;
  redirectUrl: string;
  startDate: string;
  endDate: string;
  cta: string | null;
};

@Injectable()
export class AdsService implements OnModuleDestroy {
  private readonly analyticsQueue: AppQueue;

  constructor(
    @InjectRepository(AdCampaign)
    private readonly campaignsRepo: Repository<AdCampaign>,
    @InjectRepository(AdCreative)
    private readonly creativesRepo: Repository<AdCreative>,
    @InjectRepository(AdStat)
    private readonly statsRepo: Repository<AdStat>,
    private readonly subscriptionsService: SubscriptionsService,
    configService: ConfigService,
  ) {
    this.analyticsQueue = createAppQueue(QUEUE_NAMES.analytics, configService);
  }

  async onModuleDestroy(): Promise<void> {
    await this.analyticsQueue.close();
  }

  /**
   * Tenant-facing feed. Paid plans: `plan_limits.ads_enabled = false` → empty list.
   * Free plan: only ACTIVE campaigns within schedule with at least one creative.
   */
  async getAds(user: JwtUserPayload) {
    if (!user.tenantId) {
      return { success: true, data: [] as PublicAdPayload[], meta: {}, message: '' };
    }
    const limits = await this.subscriptionsService.getPlanLimitByTenant(user.tenantId);
    if (!limits.adsEnabled) {
      return { success: true, data: [] as PublicAdPayload[], meta: {}, message: '' };
    }

    const today = new Date().toISOString().slice(0, 10);
    const campaigns = await this.campaignsRepo.find({
      where: { status: 'ACTIVE' },
      relations: ['creatives'],
      order: { createdAt: 'DESC' },
    });

    const data: PublicAdPayload[] = [];
    for (const c of campaigns) {
      if (c.startDate > today || c.endDate < today) continue;
      for (const creative of c.creatives ?? []) {
        data.push({
          id: creative.id,
          campaignId: c.id,
          title: creative.title,
          placement: c.placement,
          imageUrl: creative.imageUrl,
          redirectUrl: creative.targetUrl,
          startDate: c.startDate,
          endDate: c.endDate,
          cta: creative.cta ?? null,
        });
      }
    }

    return { success: true, data, meta: {}, message: '' };
  }

  /** Legacy: creates one campaign + one creative (same as old `ads` row concept). */
  async createLegacy(dto: CreateAdDto) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be after startDate');
    }
    const campaign = await this.campaignsRepo.save(
      this.campaignsRepo.create({
        name: dto.title,
        placement: dto.placement,
        adType: 'BANNER_AD',
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: dto.status ?? 'ACTIVE',
        industry: null,
        country: null,
        deviceType: null,
        planTarget: 'FREE_ONLY',
      }),
    );
    const creative = await this.creativesRepo.save(
      this.creativesRepo.create({
        campaignId: campaign.id,
        title: dto.title,
        description: null,
        imageUrl: dto.imageUrl,
        targetUrl: dto.redirectUrl ?? '',
        cta: null,
      }),
    );
    return {
      success: true,
      data: { campaign, creative },
      meta: {},
      message: '',
    };
  }

  async listCampaigns() {
    const rows = await this.campaignsRepo.find({
      relations: ['creatives'],
      order: { createdAt: 'DESC' },
    });
    const ids = rows.map((r) => r.id);
    const totals = new Map<string, { impressions: number; clicks: number }>();
    if (ids.length > 0) {
      const raw = await this.statsRepo
        .createQueryBuilder('s')
        .select('s.campaignId', 'campaignId')
        .addSelect('SUM(s.impressions)', 'impressions')
        .addSelect('SUM(s.clicks)', 'clicks')
        .where('s.campaignId IN (:...ids)', { ids })
        .groupBy('s.campaignId')
        .getRawMany<{ campaignId: string; impressions: string; clicks: string }>();
      for (const r of raw) {
        totals.set(r.campaignId, {
          impressions: Number(r.impressions),
          clicks: Number(r.clicks),
        });
      }
    }

    const data = rows.map((c) => {
      const t = totals.get(c.id) ?? { impressions: 0, clicks: 0 };
      return Object.assign(c, {
        impressionsTotal: t.impressions,
        clicksTotal: t.clicks,
      });
    });

    return { success: true, data, meta: {}, message: '' };
  }

  async getCampaign(id: string) {
    const row = await this.campaignsRepo.findOne({
      where: { id },
      relations: ['creatives'],
    });
    if (!row) throw new NotFoundException('Campaign not found.');

    const raw = await this.statsRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.impressions),0)', 'impressions')
      .addSelect('COALESCE(SUM(s.clicks),0)', 'clicks')
      .where('s.campaignId = :id', { id })
      .getRawOne<{ impressions: string; clicks: string }>();

    const impressionsTotal = Number(raw?.impressions ?? 0);
    const clicksTotal = Number(raw?.clicks ?? 0);

    return {
      success: true,
      data: Object.assign(row, { impressionsTotal, clicksTotal }),
      meta: {},
      message: '',
    };
  }

  async createCampaign(dto: CreateCampaignDto) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be after startDate');
    }
    const saved = await this.campaignsRepo.save(
      this.campaignsRepo.create({
        name: dto.name,
        placement: dto.placement,
        adType: dto.adType ?? 'BANNER_AD',
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: dto.status ?? 'ACTIVE',
        industry: dto.industry ?? null,
        country: dto.country ?? null,
        deviceType: dto.deviceType ?? null,
        planTarget: dto.planTarget ?? 'FREE_ONLY',
      }),
    );
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    const row = await this.campaignsRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Campaign not found.');
    if (dto.startDate != null && dto.endDate != null) {
      if (new Date(dto.endDate) < new Date(dto.startDate)) {
        throw new BadRequestException('endDate must be after startDate');
      }
    } else if (dto.endDate != null) {
      if (new Date(dto.endDate) < new Date(row.startDate)) {
        throw new BadRequestException('endDate must be after startDate');
      }
    } else if (dto.startDate != null) {
      if (new Date(row.endDate) < new Date(dto.startDate)) {
        throw new BadRequestException('endDate must be after startDate');
      }
    }

    Object.assign(row, dto);
    const saved = await this.campaignsRepo.save(row);
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async deleteCampaign(id: string) {
    const res = await this.campaignsRepo.delete(id);
    if (!res.affected) throw new NotFoundException('Campaign not found.');
    return { success: true, data: { deleted: true }, meta: {}, message: '' };
  }

  async createCreative(campaignId: string, dto: CreateAdCreativeDto) {
    const campaign = await this.campaignsRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found.');
    const saved = await this.creativesRepo.save(
      this.creativesRepo.create({
        campaignId,
        title: dto.title,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl,
        targetUrl: dto.targetUrl,
        cta: dto.cta ?? null,
      }),
    );
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async getAnalyticsSummary() {
    const totals = await this.statsRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.impressions),0)', 'impressions')
      .addSelect('COALESCE(SUM(s.clicks),0)', 'clicks')
      .addSelect('COALESCE(SUM(s.conversions),0)', 'conversions')
      .getRawOne<{ impressions: string; clicks: string; conversions: string }>();

    const series = await this.statsRepo
      .createQueryBuilder('s')
      .select('s.date', 'date')
      .addSelect('SUM(s.impressions)', 'impressions')
      .addSelect('SUM(s.clicks)', 'clicks')
      .addSelect('SUM(s.conversions)', 'conversions')
      .groupBy('s.date')
      .orderBy('s.date', 'ASC')
      .getRawMany();

    return {
      success: true,
      data: {
        totals: {
          impressions: Number(totals?.impressions ?? 0),
          clicks: Number(totals?.clicks ?? 0),
          conversions: Number(totals?.conversions ?? 0),
        },
        series: series.map((r) => ({
          date: r.date,
          impressions: Number(r.impressions),
          clicks: Number(r.clicks),
          conversions: Number(r.conversions),
        })),
      },
      meta: {},
      message: '',
    };
  }

  async track(user: JwtUserPayload, dto: TrackAdEventDto) {
    if (!user.tenantId) throw new BadRequestException('Tenant context required.');
    const limits = await this.subscriptionsService.getPlanLimitByTenant(user.tenantId);
    if (!limits.adsEnabled) {
      throw new ForbiddenException('Ads are disabled for paid plans.');
    }

    const creative = await this.creativesRepo.findOne({
      where: { id: dto.creativeId },
      relations: ['campaign'],
    });
    if (!creative?.campaign) throw new NotFoundException('Creative not found.');

    const { campaign } = creative;
    const today = new Date().toISOString().slice(0, 10);
    if (campaign.status !== 'ACTIVE' || campaign.startDate > today || campaign.endDate < today) {
      throw new BadRequestException('Campaign is not active for this date.');
    }

    let stat = await this.statsRepo.findOne({
      where: { campaignId: campaign.id, date: today },
    });
    if (!stat) {
      stat = this.statsRepo.create({
        campaignId: campaign.id,
        date: today,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      });
    }
    if (dto.eventType === 'AD_VIEW') stat.impressions += 1;
    if (dto.eventType === 'AD_CLICK') stat.clicks += 1;
    await this.statsRepo.save(stat);

    await this.analyticsQueue.add(dto.eventType, {
      tenantId: user.tenantId,
      userId: user.sub,
      entityType: 'AD_CREATIVE',
      entityId: dto.creativeId,
      campaignId: campaign.id,
      eventType: dto.eventType,
    });

    return { success: true, data: { tracked: true }, meta: {}, message: '' };
  }
}
