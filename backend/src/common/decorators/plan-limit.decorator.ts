import { SetMetadata } from '@nestjs/common';

export const PLAN_LIMIT_KEY = 'plan_limit_key';
export type PlanLimitMetric =
  | 'max_products'
  | 'max_users'
  | 'max_attributes'
  | 'max_images_per_product'
  | 'notifications_per_day';

export const PlanLimit = (metric: PlanLimitMetric) => SetMetadata(PLAN_LIMIT_KEY, metric);
