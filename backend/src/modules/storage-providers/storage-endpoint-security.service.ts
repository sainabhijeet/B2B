import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export type DnsLookupRecord = { address: string; family: 4 | 6 };
export type DnsLookupFunction = (
  hostname: string,
  options: { all: true; verbatim: false },
) => Promise<DnsLookupRecord[]>;

export const STORAGE_DNS_LOOKUP = Symbol('STORAGE_DNS_LOOKUP');

export const defaultStorageDnsLookup: DnsLookupFunction = async (
  hostname,
  options,
) => dnsLookup(hostname, options) as Promise<DnsLookupRecord[]>;

const LOCAL_HOSTS = new Set(['localhost', 'localhost.localdomain']);

@Injectable()
export class StorageEndpointSecurityService {
  constructor(
    @Inject(STORAGE_DNS_LOOKUP)
    private readonly lookup: DnsLookupFunction = defaultStorageDnsLookup,
  ) {}

  parseSafeUrl(raw: string, label: string): URL {
    let url: URL;
    try {
      url = new URL(raw.trim());
    } catch {
      throw new BadRequestException(`${label} is invalid.`);
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException(`${label} must use http or https.`);
    }
    if (url.username || url.password) {
      throw new BadRequestException(`${label} must not contain credentials.`);
    }
    this.assertSafeHostnameSyntax(url.hostname, label);
    return url;
  }

  async assertResolvedEndpointSafe(raw: string, label: string): Promise<void> {
    const url = this.parseSafeUrl(raw, label);
    const hostname = this.normalizeHost(url.hostname);
    if (isIP(hostname)) return;

    let records: DnsLookupRecord[];
    try {
      records = await this.lookup(hostname, { all: true, verbatim: false });
    } catch {
      throw new BadRequestException(`${label} hostname could not be resolved.`);
    }
    if (!records.length) {
      throw new BadRequestException(`${label} hostname could not be resolved.`);
    }
    for (const record of records) {
      this.assertSafeIp(record.address, label);
    }
  }

  assertSafeHostnameSyntax(hostname: string, label: string): void {
    const host = this.normalizeHost(hostname);
    if (!host || LOCAL_HOSTS.has(host) || host.endsWith('.localhost')) {
      throw new BadRequestException(`${label} cannot target localhost.`);
    }
    if (isIP(host)) this.assertSafeIp(host, label);
  }

  assertSafeIp(address: string, label: string): void {
    const host = this.normalizeHost(address);
    const ipVersion = isIP(host);
    if (!ipVersion || this.isPrivateOrReservedIp(host)) {
      throw new BadRequestException(`${label} cannot target private networks.`);
    }
  }

  private normalizeHost(value: string): string {
    return value.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  }

  private isPrivateOrReservedIp(host: string): boolean {
    const mapped = this.ipv4FromMappedIpv6(host);
    if (mapped) return this.isUnsafeIpv4(mapped);
    if (isIP(host) === 4) return this.isUnsafeIpv4(host);
    return this.isUnsafeIpv6(host);
  }

  private ipv4FromMappedIpv6(host: string): string | null {
    const lower = host.toLowerCase();
    const marker = '::ffff:';
    if (!lower.startsWith(marker)) return null;
    const candidate = lower.slice(marker.length);
    return isIP(candidate) === 4 ? candidate : null;
  }

  private isUnsafeIpv4(host: string): boolean {
    const parts = host.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
      return true;
    }
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && parts[2] === 2) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && parts[2] === 113) ||
      a >= 224
    );
  }

  private isUnsafeIpv6(host: string): boolean {
    const lower = host.toLowerCase();
    return (
      lower === '::' ||
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb') ||
      lower.startsWith('ff') ||
      lower.startsWith('2001:db8:')
    );
  }
}
