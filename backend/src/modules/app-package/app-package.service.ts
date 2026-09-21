import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantDistributorApp } from '../../common/entities/tenant-app.entity';
import { isValidCubePackageName } from '../../common/utils/android-app-package';

export type CheckPackageResultDto = {
  available: boolean;
  normalized: string;
  reason?: 'invalid_format' | 'taken_platform' | 'taken_play_store';
  playStoreChecked: boolean;
  playStoreListingFound?: boolean;
};

@Injectable()
export class AppPackageService {
  constructor(
    @InjectRepository(TenantDistributorApp)
    private readonly appRepo: Repository<TenantDistributorApp>,
  ) {}

  async checkPackage(packageId: string, tenantId: string | null): Promise<CheckPackageResultDto> {
    const normalized = packageId.trim().toLowerCase();
    if (!isValidCubePackageName(normalized)) {
      return {
        available: false,
        normalized,
        reason: 'invalid_format',
        playStoreChecked: false,
      };
    }

    const qb = this.appRepo
      .createQueryBuilder('a')
      .where('LOWER(TRIM(a.packageName)) = :pkg', { pkg: normalized })
      .andWhere("TRIM(a.packageName) <> ''");
    if (tenantId) {
      qb.andWhere('a.tenantId <> :tid', { tid: tenantId });
    }
    const other = await qb.getOne();
    if (other) {
      return {
        available: false,
        normalized,
        reason: 'taken_platform',
        playStoreChecked: false,
      };
    }

    const play = await this.playStoreListingExists(normalized);
    if (play.listingFound) {
      return {
        available: false,
        normalized,
        reason: 'taken_play_store',
        playStoreChecked: true,
        playStoreListingFound: true,
      };
    }

    return {
      available: true,
      normalized,
      playStoreChecked: play.checked,
      playStoreListingFound: play.checked ? false : undefined,
    };
  }

  /**
   * Best-effort: Play Store often returns HTML 200 for missing apps; we look for listing markers.
   */
  private async playStoreListingExists(packageId: string): Promise<{
    checked: boolean;
    listingFound: boolean;
  }> {
    const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageId)}`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(12_000),
      });
      const html = await res.text();
      if (res.status === 404) {
        return { checked: true, listingFound: false };
      }
      if (
        /We're sorry, the requested URL was not found|could not be found|Invalid URL|Item not found/i.test(html)
      ) {
        return { checked: true, listingFound: false };
      }
      if (/"@type"\s*:\s*"SoftwareApplication"/i.test(html)) {
        return { checked: true, listingFound: true };
      }
      if (/"softwareVersion"\s*:/i.test(html) && /"applicationCategory"\s*:/i.test(html)) {
        return { checked: true, listingFound: true };
      }
      return { checked: true, listingFound: false };
    } catch {
      return { checked: false, listingFound: false };
    }
  }
}
