import {
  DISTRIBUTOR_COUNTRY_ID_KEY,
  DISTRIBUTOR_COUNTRY_ISO_KEY,
  DISTRIBUTOR_COUNTRY_NAME_KEY,
  DISTRIBUTOR_LOGIN_PHONE_KEY,
} from "./countryIsoStorage";

const ACCESS = "saas_distributor_access_token";
const REFRESH = "saas_distributor_refresh_token";
const DEVICE = "saas_distributor_device_id";
let accessTokenMemory: string | null = null;
let refreshTokenMemory: string | null = null;

export type AuthSession = {
  sub: string;
  tenantId: string | null;
  role: string;
  customerId?: string | null;
};

let authSessionMemory: AuthSession | null = null;

export function getAccessToken(): string | null {
  if (accessTokenMemory) return accessTokenMemory;
  try {
    accessTokenMemory = sessionStorage.getItem(ACCESS);
  } catch {
    accessTokenMemory = null;
  }
  return accessTokenMemory;
}

export function getRefreshToken(): string | null {
  if (refreshTokenMemory) return refreshTokenMemory;
  try {
    refreshTokenMemory = sessionStorage.getItem(REFRESH);
  } catch {
    refreshTokenMemory = null;
  }
  return refreshTokenMemory;
}

export function getDeviceId(): string | null {
  return localStorage.getItem(DEVICE);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  accessTokenMemory = accessToken;
  refreshTokenMemory = refreshToken;
  try {
    sessionStorage.setItem(ACCESS, accessToken);
    sessionStorage.setItem(REFRESH, refreshToken);
  } catch {
    // Memory tokens still keep the current tab usable when storage is blocked.
  }
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

export function setAuthSession(session: AuthSession | null): void {
  authSessionMemory = session;
}

export function getAuthSession(): AuthSession | null {
  return authSessionMemory;
}

export function setDeviceId(deviceId: string): void {
  localStorage.setItem(DEVICE, deviceId);
}

/** Stable device id for refresh + login; create once per browser. */
export function ensureDeviceId(): string {
  let id = localStorage.getItem(DEVICE);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Date.now()}`;
    localStorage.setItem(DEVICE, id);
  }
  return id;
}

export function clearAuth(): void {
  accessTokenMemory = null;
  refreshTokenMemory = null;
  authSessionMemory = null;
  try {
    sessionStorage.removeItem(ACCESS);
    sessionStorage.removeItem(REFRESH);
  } catch {
    /* ignore */
  }
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  try {
    localStorage.removeItem(DISTRIBUTOR_COUNTRY_ISO_KEY);
    localStorage.removeItem(DISTRIBUTOR_COUNTRY_ID_KEY);
    localStorage.removeItem(DISTRIBUTOR_COUNTRY_NAME_KEY);
    localStorage.removeItem(DISTRIBUTOR_LOGIN_PHONE_KEY);
  } catch {
    /* ignore */
  }
}
