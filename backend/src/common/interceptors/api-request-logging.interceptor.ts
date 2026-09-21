import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Request, Response } from 'express';
import { catchError, finalize, Observable, throwError } from 'rxjs';
import { DataSource } from 'typeorm';
import { ApiRequestLog } from '../entities/api-request-log.entity';
import type { JwtUserPayload } from '../types/authenticated-request.type';

@Injectable()
export class ApiRequestLoggingInterceptor implements NestInterceptor {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<Request & { user?: JwtUserPayload }>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();
    let errorType: string | null = null;
    let statusCode: number | null = null;

    return next.handle().pipe(
      catchError((error: unknown) => {
        errorType = error instanceof Error ? error.constructor.name.slice(0, 128) : 'UnknownError';
        statusCode = error instanceof HttpException ? error.getStatus() : 500;
        return throwError(() => error);
      }),
      finalize(() => {
        const endpoint = String(request.originalUrl || request.url || '/')
          .split('?')[0]
          .slice(0, 512);
        const user = request.user;
        void this.dataSource
          .getRepository(ApiRequestLog)
          .insert({
            method: request.method.slice(0, 12),
            endpoint,
            statusCode: statusCode ?? response.statusCode,
            latencyMs: Math.max(0, Date.now() - startedAt),
            tenantId: user?.tenantId ?? null,
            userId: user?.sub ?? null,
            errorType,
          })
          .catch(() => undefined);
      }),
    );
  }
}
