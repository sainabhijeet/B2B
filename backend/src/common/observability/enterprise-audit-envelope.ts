import { randomUUID } from 'node:crypto';

export type EnterpriseAuditEnvelope = {
  schemaVersion: 1;
  eventId: string;
  occurredAt: string;
  domain: string;
  action: string;
  outcome: 'started' | 'completed' | 'failed' | 'rejected';
  resourceType: string;
  resourceId: string | null;
  tenantId: string | null;
  actorUserId: string | null;
  requestId: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown>;
};

export function createEnterpriseAuditEnvelope(
  input: Omit<
    EnterpriseAuditEnvelope,
    'schemaVersion' | 'eventId' | 'occurredAt'
  > &
    Partial<Pick<EnterpriseAuditEnvelope, 'eventId' | 'occurredAt'>>,
): EnterpriseAuditEnvelope {
  return {
    schemaVersion: 1,
    eventId: input.eventId ?? randomUUID(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    domain: input.domain,
    action: input.action,
    outcome: input.outcome,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    tenantId: input.tenantId ?? null,
    actorUserId: input.actorUserId ?? null,
    requestId: input.requestId ?? null,
    correlationId: input.correlationId ?? null,
    metadata: input.metadata ?? {},
  };
}
