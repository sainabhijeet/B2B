import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import {
  createEnterpriseAuditEnvelope,
  EnterpriseAuditEnvelope,
} from './enterprise-audit-envelope';

@Injectable()
export class EnterpriseAuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async record(
    input: Omit<
      EnterpriseAuditEnvelope,
      'schemaVersion' | 'eventId' | 'occurredAt'
    > &
      Partial<Pick<EnterpriseAuditEnvelope, 'eventId' | 'occurredAt'>>,
    manager?: EntityManager,
  ): Promise<EnterpriseAuditEnvelope> {
    const envelope = createEnterpriseAuditEnvelope(input);
    const repository = manager?.getRepository(AuditLog) ?? this.repository;
    await repository.save(
      repository.create({
        tenantId: envelope.tenantId,
        actorUserId: envelope.actorUserId,
        action: `${envelope.domain}.${envelope.action}`,
        metadata: envelope,
      }),
    );
    return envelope;
  }
}
