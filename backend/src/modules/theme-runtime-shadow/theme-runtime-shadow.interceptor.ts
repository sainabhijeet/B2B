import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'node:crypto';
import { ThemeRuntimeShadowService } from './theme-runtime-shadow.service';

@Injectable()
export class ThemeRuntimeShadowInterceptor implements NestInterceptor {
  constructor(private readonly shadow: ThemeRuntimeShadowService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      tenantId?: string | null;
      headers?: Record<string, string | string[] | undefined>;
      path?: string;
    }>();
    const started = Date.now();
    const tenantId = request.tenantId ?? null;
    const channel = request.path?.includes('mobile') ? 'MOBILE' : 'WEB';
    const requestIdHeader = request.headers?.['x-request-id'];
    const requestId =
      typeof requestIdHeader === 'string' && requestIdHeader.trim()
        ? requestIdHeader
        : randomUUID();
    return next.handle().pipe(
      tap((legacyResponse) => {
        if (!tenantId) return;
        void this.shadow
          .compare({
            requestId,
            tenantId,
            channel,
            legacyResponse,
            legacyDurationMs: Date.now() - started,
          })
          .catch(() => undefined);
      }),
    );
  }
}
