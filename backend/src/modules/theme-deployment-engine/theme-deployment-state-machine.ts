import type { DeploymentState } from './entities/theme-enterprise-deployment.entity';

export const DEPLOYMENT_TRANSITIONS: Record<
  DeploymentState,
  DeploymentState[]
> = {
  QUEUED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['DEPLOYING', 'FAILED', 'CANCELLED'],
  DEPLOYING: ['VERIFYING', 'FAILED'],
  VERIFYING: ['HEALTHY', 'FAILED'],
  HEALTHY: ['ROLLEDBACK'],
  FAILED: ['ROLLEDBACK'],
  ROLLEDBACK: [],
  CANCELLED: [],
};

export function canTransition(
  from: DeploymentState,
  to: DeploymentState,
): boolean {
  return DEPLOYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}
