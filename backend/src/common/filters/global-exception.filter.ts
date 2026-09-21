import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

function isMulterError(exception: unknown): exception is { name: string; code?: string; message?: string } {
  return !!exception && typeof exception === 'object' && (exception as { name?: unknown }).name === 'MulterError';
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const correlationHeader = response.getHeader('X-Correlation-Id');
    const correlationId = typeof correlationHeader === 'string' ? correlationHeader : undefined;
    const withCorrelation = (body: Record<string, unknown>): Record<string, unknown> =>
      correlationId ? { ...body, correlationId } : body;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorResponse = exception.getResponse();
      const message =
        typeof errorResponse === 'string'
          ? errorResponse
          : ((errorResponse as any)?.message ?? exception.message);

      response.status(status).json(withCorrelation({
        success: false,
        error: Array.isArray(message) ? message.join(', ') : message,
      }));
      return;
    }

    if (isMulterError(exception)) {
      const isTooLarge = exception.code === 'LIMIT_FILE_SIZE';
      response.status(isTooLarge ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST).json(withCorrelation({
        success: false,
        error: isTooLarge ? 'File is too large. Maximum upload size is 25 MB.' : (exception.message ?? 'Upload failed.'),
        message: isTooLarge ? 'File is too large. Maximum upload size is 25 MB.' : (exception.message ?? 'Upload failed.'),
      }));
      return;
    }

    const err = exception instanceof Error ? exception : null;
    if (process.env.NODE_ENV !== 'production' && err) {
      // eslint-disable-next-line no-console
      console.error('[GlobalExceptionFilter]', err.message);
    }

    /** Show real error in JSON when not production, or when explicitly enabled (local prod debugging). */
    const exposeDetails =
      process.env.NODE_ENV !== 'production' || process.env.HTTP_500_DEBUG === 'true';
    const body: Record<string, unknown> = {
      success: false,
      error: 'Internal server error',
      /** Duplicate for clients that only read `message` (admin `formatErrorMessage` prefers it first). */
      message: 'Internal server error',
    };
    if (exposeDetails && err?.message) {
      body.debug = err.message;
      const driver = (exception as { driverError?: { code?: string; detail?: string } })?.driverError;
      if (driver?.code) body.pgCode = driver.code;
      if (driver?.detail) body.pgDetail = driver.detail;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(withCorrelation(body));
  }
}
