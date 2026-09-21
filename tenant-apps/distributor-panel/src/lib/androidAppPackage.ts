export const PACKAGE_PREFIX = "co.cube.";

const PACKAGE_REGEX = /^co\.cube\.[a-z0-9]{3,}$/;

export function brandToPackageSlug(brand: string): string {
  let slug = brand
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!slug) {
    slug = "store";
  } else if (slug.length < 3) {
    slug = slug.padEnd(3, "x");
  }
  return slug.slice(0, 48);
}

export function defaultAppNameFromBrand(brand: string): string {
  const b = brand.trim();
  return b || "My store";
}

export function defaultPackageNameFromBrand(brand: string): string {
  return `${PACKAGE_PREFIX}${brandToPackageSlug(brand)}`;
}

/** Last segment only (editable part of the Android package id). */
export function suffixFromFullPackage(pkg: string): string {
  const p = pkg.trim().toLowerCase();
  if (p.startsWith(PACKAGE_PREFIX)) {
    return p.slice(PACKAGE_PREFIX.length).replace(/[^a-z0-9]/g, "");
  }
  return p.replace(/[^a-z0-9]/g, "");
}

export function fullPackageFromSuffix(suffix: string): string {
  return `${PACKAGE_PREFIX}${suffix.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

export function isValidCubePackageName(pkg: string): boolean {
  return PACKAGE_REGEX.test(pkg.trim().toLowerCase());
}
