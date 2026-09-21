import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { readThemeMigrationFlags } from './theme-migration-flags';
import { RequestContextService } from './request-context.service';

const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/u;

function headerValue(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && SAFE_ID.test(candidate) ? candidate : undefined;
}

/** Opt-in request/correlation headers for Phase 0 diagnostics. */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const enabled = readThemeMigrationFlags(
      this.configService,
    ).diagnosticsEnabled;
    if (!enabled) {
      next();
      return;
    }

    const correlationId =
      headerValue(req.headers['x-correlation-id']) ?? randomUUID();
    const requestId = headerValue(req.headers['x-request-id']) ?? randomUUID();
    const context = {
      correlationId,
      requestId,
      method: req.method,
      path: (req.originalUrl || req.url).split('?')[0] || '/',
      startedAt: Date.now(),
    };

    res.setHeader('X-Correlation-Id', correlationId);
    res.setHeader('X-Request-Id', requestId);
    this.requestContext.run(context, () => next());
  }
}
