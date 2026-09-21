import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ThemeQuarantineStorageService } from './theme-quarantine-storage.service';

describe('ThemeQuarantineStorageService', () => {
  it('is idempotent for a repeated idempotency key', async () => {
    const root = await fs.mkdtemp(
      path.join(process.cwd(), 'tmp-theme-quarantine-'),
    );
    const config = new ConfigService({
      themeReleasePipeline: { quarantineDir: root },
    });
    const service = new ThemeQuarantineStorageService(config);
    try {
      const first = await service.write(
        'repeatable-key',
        Readable.from(Buffer.from('zip-data')),
        1024,
      );
      const second = await service.write(
        'repeatable-key',
        Readable.from(Buffer.from('different-data')),
        1024,
      );
      expect(second.key).toBe(first.key);
      expect(second.sha256).toBe(first.sha256);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
