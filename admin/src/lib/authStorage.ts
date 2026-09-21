const ACCESS = 'saas_admin_access_token';
const REFRESH = 'saas_admin_refresh_token';
const DEVICE = 'saas_admin_device_id';
let accessTokenMemory: string | null = null;
let refreshTokenMemory: string | null = null;

export function getAccessToken(): string | null {
  return accessTokenMemory;
}

export function getRefreshToken(): string | null {
  return refreshTokenMemory;
}

export function getDeviceId(): string | null {
  return localStorage.getItem(DEVICE);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  accessTokenMemory = accessToken;
  refreshTokenMemory = refreshToken;
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

export function setDeviceId(deviceId: string): void {
  localStorage.setItem(DEVICE, deviceId);
}

/** Stable device id for refresh + login; create once per browser. */
export function ensureDeviceId(): string {
  let id = localStorage.getItem(DEVICE);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}`;
    localStorage.setItem(DEVICE, id);
  }
  return id;
}

export function clearAuth(): void {
  accessTokenMemory = null;
  refreshTokenMemory = null;
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}
