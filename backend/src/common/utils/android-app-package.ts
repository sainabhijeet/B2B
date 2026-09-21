const PACKAGE_PREFIX = 'co.cube.';
const PACKAGE_REGEX = /^co\.cube\.[a-z0-9]{3,}$/;

/**
 * Android package id segment from brand / store name (lowercase, letters and digits only).
 */
export function brandToPackageSlug(brand: string): string {
  let slug = brand
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!slug) {
    slug = 'store';
  } else if (slug.length < 3) {
    slug = slug.padEnd(3, 'x');
  }
  return slug.slice(0, 48);
}

export function defaultAppNameFromBrand(brand: string): string {
  return brand.trim() || 'My store';
}

export function defaultPackageNameFromBrand(brand: string): string {
  return `${PACKAGE_PREFIX}${brandToPackageSlug(brand)}`;
}

export function isValidCubePackageName(pkg: string): boolean {
  const s = pkg.trim().toLowerCase();
  return PACKAGE_REGEX.test(s);
}
