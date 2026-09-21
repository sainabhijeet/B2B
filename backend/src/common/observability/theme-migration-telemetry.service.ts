import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestContextService } from './request-context.service';
import { readThemeMigrationFlags } from './theme-migration-flags';
import {
  createThemeMigrationLog,
  ThemeMigrationLogInput,
} from './theme-migration-log';

/**
 * Structured, opt-in diagnostics for the legacy theme paths during migration.
 * It deliberately records identifiers and outcomes only; package contents,
 * credentials, request bodies, and filesystem paths are never emitted.
 */
@Injectable()
export class ThemeMigrationTelemetryService {
  private readonly logger = new Logger('ThemeMigration');

  constructor(
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
  ) {}

  record(
    event: string,
    fields: Omit<ThemeMigrationLogInput, 'event'> = {},
  ): void {
    if (!readThemeMigrationFlags(this.configService).diagnosticsEnabled) return;

    const context = this.requestContext.get();
    this.logger.log(
      JSON.stringify(
        createThemeMigrationLog({
          event,
          ...fields,
          correlationId: context?.correlationId ?? null,
          requestId: context?.requestId ?? null,
          requestMethod: context?.method ?? null,
          requestPath: context?.path ?? null,
        }),
      ),
    );
  }
}
