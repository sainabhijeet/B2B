import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ENCRYPTED_PREFIX = 'enc:v1:aes-256-gcm:';

function toBase64Url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad =
    normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64');
}

@Injectable()
export class CredentialEncryptionService {
  constructor(private readonly configService: ConfigService) {}

  isEncrypted(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
  }

  isConfigured(): boolean {
    return this.getKeySource().length > 0;
  }

  encrypt(plaintext: string): string {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${ENCRYPTED_PREFIX}${toBase64Url(iv)}.${toBase64Url(tag)}.${toBase64Url(ciphertext)}`;
  }

  decrypt(value: string): string {
    if (!this.isEncrypted(value)) return value;
    const key = this.getKey();
    const payload = value.slice(ENCRYPTED_PREFIX.length);
    const [ivRaw, tagRaw, ciphertextRaw] = payload.split('.');
    if (!ivRaw || !tagRaw || !ciphertextRaw) {
      throw new Error('Encrypted credential payload is malformed.');
    }
    const decipher = createDecipheriv('aes-256-gcm', key, fromBase64Url(ivRaw));
    decipher.setAuthTag(fromBase64Url(tagRaw));
    return Buffer.concat([
      decipher.update(fromBase64Url(ciphertextRaw)),
      decipher.final(),
    ]).toString('utf8');
  }

  mask(value: string | null | undefined): string {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return '—';
    if (this.isEncrypted(trimmed)) return '••••••••';
    if (trimmed.length <= 4) return '••••';
    return `••••••••${trimmed.slice(-4)}`;
  }

  private getKey(): Buffer {
    const source = this.getKeySource();
    if (!source) {
      throw new Error(
        'CONFIG_ENCRYPTION_KEY is required to encrypt or decrypt protected credentials.',
      );
    }
    return createHash('sha256').update(source, 'utf8').digest();
  }

  private getKeySource(): string {
    return (
      this.configService.get<string>(
        'credentialProtection.encryptionKey',
        '',
      ) ?? ''
    ).trim();
  }
}
