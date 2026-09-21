import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PLAN_LIMIT_KEY, PlanLimitMetric } from '../decorators/plan-limit.decorator';
import { PlanLimit as PlanLimitEntity } from '../entities/plan-limit.entity';
import { Subscription } from '../entities/subscription.entity';
import { Product } from '../entities/product.entity';
import { AuthenticatedRequest } from '../types/authenticated-request.type';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(PlanLimitEntity)
    private readonly limitsRepo: Repository<PlanLimitEntity>,
    private readonly tenantRunner: TenantSchemaRunner,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metric = this.reflector.getAllAndOverride<PlanLimitMetric>(PLAN_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!metric) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user?.tenantId) return true;

    const subscription = await this.subscriptionsRepo.findOne({ where: { tenantId: user.tenantId } });
    if (!subscription) {
      throw new ForbiddenException('No active subscription found for tenant.');
    }
    const now = new Date();
    const expired = subscription.expiryDate
      ? new Date(`${subscription.expiryDate}T23:59:59.999Z`) < now
      : false;
    const trialExpired = subscription.status === 'TRIAL'
      && (!subscription.trialEndsAt || subscription.trialEndsAt < now);
    if (!['ACTIVE', 'TRIAL'].includes(subscription.status) || expired || trialExpired) {
      throw new ForbiddenException('An active subscription is required for this operation.');
    }
    const planLimit = await this.limitsRepo.findOne({ where: { planName: subscription.planName } });
    if (!planLimit) {
      throw new ForbiddenException('Plan limits not configured.');
    }

    const limitValue = this.resolveLimit(planLimit, metric);
    if (limitValue <= 0) {
      throw new ForbiddenException(`Plan limit exceeded for ${metric}.`);
    }

    if (metric === 'max_products') {
      const current = await this.tenantRunner.withTenantCatalog(user.tenantId, (manager) =>
        manager.getRepository(Product).count({ where: { tenantId: user.tenantId! } }),
      );
      if (current >= limitValue) {
        throw new ForbiddenException(`Plan limit exceeded for ${metric}.`);
      }
    }

    return true;
  }

  private resolveLimit(planLimit: PlanLimitEntity, metric: PlanLimitMetric): number {
    const mapper: Record<PlanLimitMetric, number> = {
      max_products: planLimit.maxProducts,
      max_users: planLimit.maxUsers,
      max_attributes: planLimit.maxAttributes,
      max_images_per_product: planLimit.maxImagesPerProduct,
      notifications_per_day: planLimit.notificationsPerDay,
    };
    return mapper[metric] ?? 0;
  }
}
