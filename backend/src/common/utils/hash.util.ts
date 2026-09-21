import { createHash, randomBytes } from 'crypto';

export const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

export const randomToken = (size = 32): string => randomBytes(size).toString('hex');
