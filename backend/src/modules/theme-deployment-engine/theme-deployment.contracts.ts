import type {
  DeploymentChannel,
  DeploymentEnvironment,
  DeploymentState,
} from './entities/theme-enterprise-deployment.entity';

export type DeploymentRequest = {
  tenantId: string;
  channel: DeploymentChannel;
  environment: DeploymentEnvironment;
  releaseCandidateId: string;
  idempotencyKey: string;
  expectedCompatibility?: Record<string, unknown>;
  canaryMetadata?: Record<string, unknown>;
  rolloutMetadata?: Record<string, unknown>;
  rollbackMetadata?: Record<string, unknown>;
  priority?: number;
};

export type DeploymentActionRequest = {
  idempotencyKey: string;
  expectedSequence: number;
  metadata?: Record<string, unknown>;
};

export type DeploymentProgressRequest = {
  idempotencyKey: string;
  percent: number;
  message?: string;
};

export type DeploymentView = {
  id: string;
  tenantId: string;
  channel: DeploymentChannel;
  environment: DeploymentEnvironment;
  releaseCandidateId: string;
  snapshotId: string;
  state: DeploymentState;
  sequence: number;
  snapshotHash: string;
  dependencyReport: Record<string, unknown>;
  versionGraph: Record<string, unknown>;
};
