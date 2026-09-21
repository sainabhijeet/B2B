import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantResolver } from './tenant.resolver';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantResolver: TenantResolver) {}

  async use(req: Request & { tenantId?: string | null }, _res: Response, next: NextFunction) {
    try {
      req.tenantId = await this.tenantResolver.resolveTenantFromRequest(req);
      next();
    } catch (err) {
      next(err);
    }
  }
}
