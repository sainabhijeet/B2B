import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Plan } from '../../common/entities/plan.entity';
import { ReferralCode } from '../../common/entities/referral-code.entity';
import { ReferralCommission } from '../../common/entities/referral-commission.entity';
import { ReferralConversion } from '../../common/entities/referral-conversion.entity';
import { ReferralSetting } from '../../common/entities/referral-setting.entity';
import { Subscription } from '../../common/entities/subscription.entity';
import { User } from '../../common/entities/user.entity';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { AdminPayoutDto } from './dto/admin-payout.dto';
import { TrackReferralDto } from './dto/track-referral.dto';
import { randomBytes } from 'node:crypto';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(ReferralCode)
    private readonly referralCodesRepo: Repository<ReferralCode>,
    @InjectRepository(ReferralConversion)
    private readonly referralConversionsRepo: Repository<ReferralConversion>,
    @InjectRepository(ReferralCommission)
    private readonly referralCommissionsRepo: Repository<ReferralCommission>,
    @InjectRepository(ReferralSetting)
    private readonly referralSettingsRepo: Repository<ReferralSetting>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly plansRepo: Repository<Plan>,
  ) {}

  async getOrCreateCode(user: JwtUserPayload) {
    const existing = await this.referralCodesRepo.findOne({ where: { userId: user.sub } });
    if (existing) return { success: true, data: existing, meta: {}, message: '' };
    const seed = user.sub.replace(/-/g, '').slice(0, 8).toUpperCase();
    const code = `${seed}${randomBytes(4).toString('hex').toUpperCase()}`;
    const row = await this.referralCodesRepo.save(
      this.referralCodesRepo.create({ userId: user.sub, code, status: 'ACTIVE' }),
    );
    return { success: true, data: row, meta: {}, message: '' };
  }

  /** Called after tenant is created; optional `?ref=` from signup (platform admin creates tenant with body). */
  async recordTenantSignupFromReferral(params: {
    referralCode?: string | null;
    tenantId: string;
    ownerEmail: string;
    clientIp?: string | null;
  }): Promise<void> {
    const raw = params.referralCode?.trim();
    if (!raw) return;
    const existingConv = await this.referralConversionsRepo.findOne({
      where: { referredTenantId: params.tenantId },
    });
    if (existingConv) return;

    const ref = await this.referralCodesRepo
      .createQueryBuilder('r')
      .where('UPPER(TRIM(r.code)) = UPPER(TRIM(:c))', { c: raw })
      .getOne();
    if (!ref || ref.status !== 'ACTIVE') return;

    const referrer = await this.usersRepo.findOne({ where: { id: ref.userId } });
    if (!referrer) return;
    if (referrer.email?.toLowerCase() === params.ownerEmail.toLowerCase()) {
      return;
    }

    let fraudFlag = false;
    if (params.clientIp) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await this.referralConversionsRepo.count({
        where: { clientIp: params.clientIp, createdAt: MoreThan(since) },
      });
      if (recent >= 5) fraudFlag = true;
    }

    await this.referralConversionsRepo.save(
      this.referralConversionsRepo.create({
        referrerUserId: ref.userId,
        referredTenantId: params.tenantId,
        subscriptionId: null,
        status: 'REGISTERED',
        clientIp: params.clientIp ?? null,
        fraudFlag,
      }),
    );
  }

  /** When SaaS subscription payment succeeds (Razorpay or manual admin). */
  async onSubscriptionPaid(params: {
    tenantId: string;
    subscriptionId: string;
    amountInr: number;
  }): Promise<void> {
    const conv = await this.referralConversionsRepo.findOne({
      where: { referredTenantId: params.tenantId, status: 'REGISTERED' },
      order: { createdAt: 'DESC' },
    });
    if (!conv) return;
    const existingCommission = await this.referralCommissionsRepo.findOne({
      where: { conversionId: conv.id },
    });
    if (existingCommission) return;

    conv.subscriptionId = params.subscriptionId;
    conv.status = 'SUBSCRIBED';
    await this.referralConversionsRepo.save(conv);

    const settings = await this.getSettings();
    const commission = (Number(settings.commissionPercent) / 100) * params.amountInr;
    await this.referralCommissionsRepo.save(
      this.referralCommissionsRepo.create({
        referrerUserId: conv.referrerUserId,
        conversionId: conv.id,
        amount: String(Math.round(commission * 100) / 100),
        status: 'PENDING',
      }),
    );
  }

  async trackConversion(user: JwtUserPayload, dto: TrackReferralDto) {
    if (user.tenantId === dto.referredTenantId) {
      throw new BadRequestException('Self-referral blocked.');
    }
    const conversion = await this.referralConversionsRepo.save(
      this.referralConversionsRepo.create({
        referrerUserId: user.sub,
        referredTenantId: dto.referredTenantId,
        subscriptionId: dto.subscriptionId ?? null,
        status: dto.subscriptionId ? 'SUBSCRIBED' : 'REGISTERED',
        clientIp: null,
        fraudFlag: false,
      }),
    );
    if (dto.subscriptionId) {
      const settings = await this.getSettings();
      let baseAmount = 2000;
      const sub = await this.subscriptionsRepo.findOne({ where: { id: dto.subscriptionId } });
      if (sub?.planId) {
        const plan = await this.plansRepo.findOne({ where: { id: sub.planId } });
        if (plan) baseAmount = Number(plan.price);
      }
      await this.referralCommissionsRepo.save(
        this.referralCommissionsRepo.create({
          referrerUserId: user.sub,
          conversionId: conversion.id,
          amount: String(Math.round((Number(settings.commissionPercent) / 100) * baseAmount * 100) / 100),
          status: 'PENDING',
        }),
      );
    }
    return { success: true, data: conversion, meta: {}, message: '' };
  }

  async stats(user: JwtUserPayload) {
    const totalReferrals = await this.referralConversionsRepo.count({ where: { referrerUserId: user.sub } });
    const activeSubscriptions = await this.referralConversionsRepo.count({
      where: { referrerUserId: user.sub, status: 'SUBSCRIBED' },
    });
    const earnedRaw = await this.referralCommissionsRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'sum')
      .where('c.referrer_user_id = :userId', { userId: user.sub })
      .andWhere("c.status = 'PAID'")
      .getRawOne<{ sum: string }>();
    return {
      success: true,
      data: {
        total_referrals: totalReferrals,
        active_subscriptions: activeSubscriptions,
        commission_earned: Number(earnedRaw?.sum ?? 0),
      },
      meta: {},
      message: '',
    };
  }

  async conversions(user: JwtUserPayload) {
    const rows = await this.referralConversionsRepo.find({
      where: { referrerUserId: user.sub },
      order: { createdAt: 'DESC' },
    });
    return { success: true, data: rows, meta: {}, message: '' };
  }

  async adminOverview() {
    const [codes, conversions, commissions] = await Promise.all([
      this.referralCodesRepo.count(),
      this.referralConversionsRepo.count(),
      this.referralCommissionsRepo.count(),
    ]);
    return { success: true, data: { codes, conversions, commissions }, meta: {}, message: '' };
  }

  async adminConversions() {
    const rows = await this.referralConversionsRepo.find({ order: { createdAt: 'DESC' } });
    return { success: true, data: rows, meta: {}, message: '' };
  }

  async adminCommissions() {
    const rows = await this.referralCommissionsRepo.find({ order: { createdAt: 'DESC' } });
    return { success: true, data: rows, meta: {}, message: '' };
  }

  async payout(dto: AdminPayoutDto) {
    const commission = await this.referralCommissionsRepo.findOne({ where: { id: dto.commissionId } });
    if (!commission) throw new NotFoundException('Commission not found.');
    commission.status = dto.status;
    const saved = await this.referralCommissionsRepo.save(commission);
    const conversion = await this.referralConversionsRepo.findOne({ where: { id: commission.conversionId } });
    if (conversion && dto.status === 'PAID') {
      conversion.status = 'COMMISSION_PAID';
      await this.referralConversionsRepo.save(conversion);
    }
    return { success: true, data: saved, meta: {}, message: '' };
  }

  private async getSettings() {
    const first = await this.referralSettingsRepo.findOne({ where: {} });
    if (first) return first;
    return this.referralSettingsRepo.save(this.referralSettingsRepo.create({}));
  }
}
