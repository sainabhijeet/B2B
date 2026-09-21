import { BadRequestException } from '@nestjs/common';

/** Digits only; same rules as distributor-created `customers.mobile`. */
export function normalizeCustomerMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 20) {
    throw new BadRequestException('Mobile must be 8–20 digits.');
  }
  return digits;
}
