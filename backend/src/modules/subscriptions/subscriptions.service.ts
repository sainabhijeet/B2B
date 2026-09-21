import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanLimit } from '../../common/entities/plan-limit.entity';
import { Subscription } from '../../common/entities/subscription.entity';
import { Tenant } from '../../common/entities/tenant.entity';
import { TenantStatus } from '../../common/enums/tenant-status.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(PlanLimit)
    private readonly planLimitsRepo: Repository<PlanLimit>,
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
  ) {}

  async getPlans() {
    const plans = await this.planLimitsRepo.find({ order: { createdAt: 'ASC' } });
    return { success: true, data: plans, meta: {}, message: '' };
  }

  async subscribe(dto: SubscribeDto) {
    const tenant = await this.tenantsRepo.findOne({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found.');

    const planLimit = await this.planLimitsRepo.findOne({ where: { planName: dto.planName } });
    if (!planLimit) throw new BadRequestException('Invalid plan name.');

    const today = new Date().toISOString().slice(0, 10);
    let row = await this.subscriptionsRepo.findOne({ where: { tenantId: dto.tenantId } });
    if (!row) {
      row = this.subscriptionsRepo.create({
        tenantId: dto.tenantId,
        planName: dto.planName,
        status: 'ACTIVE',
        startDate: dto.startDate ?? today,
        expiryDate: dto.expiryDate ?? null,
      });
    } else {
      row.planName = dto.planName;
      row.startDate = dto.startDate ?? row.startDate;
      row.expiryDate = dto.expiryDate ?? row.expiryDate;
      row.status = 'ACTIVE';
    }
    const saved = await this.subscriptionsRepo.save(row);

    if (tenant.status === TenantStatus.SUSPENDED) {
      tenant.status = TenantStatus.ACTIVE;
      await this.tenantsRepo.save(tenant);
    }

    return { success: true, data: saved, meta: {}, message: '' };
  }

  async getCurrent(user: JwtUserPayload) {
    if (!user.tenantId) throw new BadRequestException('Tenant context required.');
    const subscription = await this.subscriptionsRepo.findOne({ where: { tenantId: user.tenantId } });
    if (!subscription) throw new NotFoundException('Subscription not found.');

    if (subscription.expiryDate && new Date(subscription.expiryDate) < new Date()) {
      await this.expireSubscription(user.tenantId);
      return {
        success: true,
        data: { ...subscription, status: 'EXPIRED', renewalReminder: true },
        meta: {},
        message: '',
      };
    }

    return { success: true, data: subscription, meta: {}, message: '' };
  }

  async getPlanLimitByTenant(tenantId: string): Promise<PlanLimit> {
    const subscription = await this.subscriptionsRepo.findOne({ where: { tenantId } });
    if (!subscription) throw new NotFoundException('Subscription not found.');
    const limits = await this.planLimitsRepo.findOne({ where: { planName: subscription.planName } });
    if (!limits) throw new NotFoundException('Plan limits not configured.');
    return limits;
  }

  async expireSubscription(tenantId: string): Promise<void> {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) return;
    tenant.status = TenantStatus.SUSPENDED;
    await this.tenantsRepo.save(tenant);

    const sub = await this.subscriptionsRepo.findOne({ where: { tenantId } });
    if (sub) {
      sub.status = 'EXPIRED';
      await this.subscriptionsRepo.save(sub);
    }
  }
}
