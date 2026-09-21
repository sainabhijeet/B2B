import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../common/entities/audit-log.entity';

interface AuditLogInput {
  action: string;
  tenantId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(input: AuditLogInput): Promise<void> {
    const entity = this.auditLogRepository.create({
      action: input.action,
      tenantId: input.tenantId ?? null,
      actorUserId: input.actorUserId ?? null,
      metadata: input.metadata ?? null,
    });
    await this.auditLogRepository.save(entity);
  }
}
