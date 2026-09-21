import type { ThemeReleaseCandidateStatus } from './entities/theme-release-candidate.entity';

export type ThemeReleaseLifecycleAction =
  | 'draft'
  | 'edit'
  | 'review'
  | 'approve'
  | 'reject'
  | 'publish'
  | 'deprecate'
  | 'archive'
  | 'rollback-metadata'
  | 'assign-reviewer'
  | 'comment';

export type ThemeReleaseLifecycleRequest = {
  idempotencyKey: string;
  expectedRevision: number;
  comment?: string;
  metadata?: Record<string, unknown>;
};

export type ThemeReleaseLifecycleResponse = {
  candidateId: string;
  status: ThemeReleaseCandidateStatus;
  lifecycleRevision: number;
  immutablePackageSha256: string | null;
  releaseNotes: string | null;
  changelog: Array<Record<string, unknown>>;
  rollbackMetadata: Record<string, unknown>;
};

export type ThemeReleaseTimelineItem = {
  action: ThemeReleaseLifecycleAction | string;
  fromStatus: ThemeReleaseCandidateStatus | null;
  toStatus: ThemeReleaseCandidateStatus;
  actorUserId: string | null;
  createdAt: string;
};
