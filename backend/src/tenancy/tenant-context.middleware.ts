import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NextFunction, Request, Response } from 'express';
import { Repository } from 'typeorm';
import { Tenant } from '../common/entities/tenant.entity';
import { tenantRequestAls } from './tenant-request-context';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async use(req: Request & { tenantId?: string | null }, _res: Response, next: NextFunction) {
    const tenantId = req.tenantId ?? null;
    if (!tenantId) {
      tenantRequestAls.run(
        { tenantId: null, schemaName: null, tenantSchemaProvisioned: false },
        () => next(),
      );
      return;
    }

    try {
      const tenant = await this.tenantRepo.findOne({
        where: { id: tenantId },
        select: ['id', 'schemaName', 'tenantSchemaProvisioned'],
      });
      tenantRequestAls.run(
        {
          tenantId,
          schemaName: tenant?.schemaName ?? null,
          tenantSchemaProvisioned: tenant?.tenantSchemaProvisioned ?? false,
        },
        () => next(),
      );
    } catch (err) {
      next(err);
    }
  }
}
