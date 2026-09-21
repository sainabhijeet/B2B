import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class MobileReleaseCryptoService {
  constructor(private readonly config: ConfigService) {}

  encrypt(value: string | null | undefined): string | null {
    if (!value?.trim()) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  decrypt(payload: string | null | undefined): string | null {
    if (!payload) return null;
    const [version, ivRaw, tagRaw, encryptedRaw] = payload.split(':');
    if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) {
      throw new InternalServerErrorException('Stored release credential is not readable.');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(ivRaw, 'base64'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private key(): Buffer {
    const source =
      process.env.MOBILE_RELEASE_ENCRYPTION_KEY?.trim() ||
      this.config.get<string>('jwt.refreshSecret') ||
      this.config.get<string>('jwt.accessSecret');
    if (!source) throw new InternalServerErrorException('MOBILE_RELEASE_ENCRYPTION_KEY is required.');
    if (/^[A-Za-z0-9+/=]{44}$/.test(source)) {
      const decoded = Buffer.from(source, 'base64');
      if (decoded.length === 32) return decoded;
    }
    return createHash('sha256').update(source).digest();
  }
}
