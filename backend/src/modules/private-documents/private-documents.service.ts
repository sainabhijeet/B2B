import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getBackendStorageRoot } from '../../common/utils/storage-root';

const PRIVATE_PREFIX = 'private://';
const LEGACY_PREFIX = 'legacy://';

type StoredDocument = {
  reference: string;
  originalName: string;
  contentType: string;
};

@Injectable()
export class PrivateDocumentsService {
  private readonly root: string;
  private readonly signingSecret: string;
  private readonly apiPrefix: string;
  private readonly ttlSeconds: number;

  constructor(config: ConfigService) {
    this.root = path.resolve(config.get<string>('documents.privateStorageDir', path.join(process.cwd(), 'private-storage')));
    this.signingSecret = config.getOrThrow<string>('documents.signingSecret');
    this.apiPrefix = config.get<string>('apiPrefix', 'api/v1').replace(/^\/+|\/+$/g, '');
    this.ttlSeconds = config.get<number>('documents.signedUrlTtlSeconds', 300);
  }

  async store(input: {
    tenantId: string;
    category: 'invoices' | 'payment-proofs' | 'gst-files' | 'retailer-documents' | 'admin-media' | 'return-photos';
    ownerId: string;
    file: Express.Multer.File;
  }): Promise<StoredDocument> {
    const detected = this.detectFile(input.file.buffer);
    if (!detected) {
      throw new BadRequestException('The uploaded file content is not a supported PDF, JPG, PNG, or WEBP document.');
    }
    if (input.category === 'return-photos' && detected.contentType === 'application/pdf') {
      throw new BadRequestException('Replacement evidence must be a JPG, PNG, or WEBP image.');
    }
    const relative = path.posix.join(
      input.category,
      input.tenantId,
      input.ownerId,
      `${randomUUID()}${detected.extension}`,
    );
    const absolute = this.resolvePrivate(relative);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, input.file.buffer, { flag: 'wx', mode: 0o600 });
    return {
      reference: `${PRIVATE_PREFIX}${relative}`,
      originalName: path.basename(input.file.originalname || `document${detected.extension}`),
      contentType: detected.contentType,
    };
  }

  async storeBuffer(input: {
    tenantId: string;
    category: 'invoices';
    ownerId: string;
    extension: '.pdf';
    contentType: 'application/pdf';
    originalName: string;
    buffer: Buffer;
  }): Promise<StoredDocument> {
    const relative = path.posix.join(
      input.category,
      input.tenantId,
      input.ownerId,
      `${randomUUID()}${input.extension}`,
    );
    const absolute = this.resolvePrivate(relative);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, input.buffer, { flag: 'wx', mode: 0o600 });
    return {
      reference: `${PRIVATE_PREFIX}${relative}`,
      originalName: path.basename(input.originalName),
      contentType: input.contentType,
    };
  }

  sign(reference: string | null | undefined, expiresInSeconds = this.ttlSeconds): string | null {
    const normalized = this.normalizeReference(reference);
    if (!normalized) return null;
    const encoded = Buffer.from(normalized, 'utf8').toString('base64url');
    const expires = Math.floor(Date.now() / 1000) + Math.max(30, Math.min(expiresInSeconds, 900));
    const signature = this.signature(encoded, expires);
    return `/${this.apiPrefix}/documents/download?key=${encodeURIComponent(encoded)}&expires=${expires}&signature=${signature}`;
  }

  async resolveSigned(encodedKey: string, expires: number, signature: string): Promise<{
    absolutePath: string;
    fileName: string;
    contentType: string;
  }> {
    if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Document link has expired.');
    }
    if (expires > Math.floor(Date.now() / 1000) + 900) {
      throw new UnauthorizedException('Invalid document link expiry.');
    }
    const expected = this.signature(encodedKey, expires);
    const provided = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (provided.length !== expectedBuffer.length || !timingSafeEqual(provided, expectedBuffer)) {
      throw new UnauthorizedException('Invalid document signature.');
    }
    let reference: string;
    try {
      reference = Buffer.from(encodedKey, 'base64url').toString('utf8');
    } catch {
      throw new UnauthorizedException('Invalid document key.');
    }
    const absolutePath = this.resolveStoredReference(reference);
    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) throw new Error('not_file');
    } catch {
      throw new NotFoundException('Document not found.');
    }
    const extension = path.extname(absolutePath).toLowerCase();
    return {
      absolutePath,
      fileName: path.basename(absolutePath),
      contentType: this.contentTypeForExtension(extension),
    };
  }

  async delete(reference: string | null | undefined): Promise<void> {
    const normalized = this.normalizeReference(reference);
    if (!normalized) return;
    const absolute = this.resolveStoredReference(normalized);
    await fs.rm(absolute, { force: true });
  }

  private normalizeReference(reference: string | null | undefined): string | null {
    const value = reference?.trim();
    if (!value) return null;
    if (value.startsWith(PRIVATE_PREFIX) || value.startsWith(LEGACY_PREFIX)) return value;
    if (value.startsWith('/storage/')) return `${LEGACY_PREFIX}${value.slice('/storage/'.length)}`;
    throw new BadRequestException('Invalid private document reference.');
  }

  private resolveStoredReference(reference: string): string {
    if (reference.startsWith(PRIVATE_PREFIX)) {
      return this.resolvePrivate(reference.slice(PRIVATE_PREFIX.length));
    }
    if (reference.startsWith(LEGACY_PREFIX)) {
      return this.resolveUnderRoot(getBackendStorageRoot(), reference.slice(LEGACY_PREFIX.length));
    }
    throw new BadRequestException('Invalid document reference.');
  }

  private resolvePrivate(relative: string): string {
    return this.resolveUnderRoot(this.root, relative);
  }

  private resolveUnderRoot(root: string, relative: string): string {
    if (!relative || relative.includes('\0')) throw new BadRequestException('Invalid document path.');
    const resolvedRoot = path.resolve(root);
    const resolved = path.resolve(resolvedRoot, relative.replace(/^[/\\]+/, ''));
    if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
      throw new BadRequestException('Invalid document path.');
    }
    return resolved;
  }

  private signature(encodedKey: string, expires: number): string {
    return createHmac('sha256', this.signingSecret)
      .update(`${encodedKey}.${expires}`)
      .digest('hex');
  }

  private detectFile(buffer: Buffer): { extension: string; contentType: string } | null {
    if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF') {
      return { extension: '.pdf', contentType: 'application/pdf' };
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { extension: '.jpg', contentType: 'image/jpeg' };
    }
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return { extension: '.png', contentType: 'image/png' };
    }
    if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return { extension: '.webp', contentType: 'image/webp' };
    }
    return null;
  }

  private contentTypeForExtension(extension: string): string {
    if (extension === '.pdf') return 'application/pdf';
    if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
    if (extension === '.png') return 'image/png';
    if (extension === '.webp') return 'image/webp';
    return 'application/octet-stream';
  }
}
