import { cookies } from "next/headers";
import { apiBaseUrl } from "@/lib/api-origin";
import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies";
import { refreshCustomerTokensFromCookies } from "@/lib/server-customer-token-refresh";
import { storefrontHostHeaderAsync } from "@/lib/storefrontApi";

async function doFetch(path: string, init?: RequestInit): Promise<Response> {
  const [cookieStore, tenantHeaders] = await Promise.all([
    cookies(),
    storefrontHostHeaderAsync(),
  ]);
  const token = cookieStore.get(CUSTOMER_ACCESS_COOKIE)?.value;
  const base = apiBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const reqHeaders = new Headers(init?.headers);
  if (token) reqHeaders.set("Authorization", `Bearer ${token}`);
  for (const [name, value] of Object.entries(tenantHeaders)) {
    if (!reqHeaders.has(name)) reqHeaders.set(name, value);
  }
  return fetch(url, { ...init, headers: reqHeaders, cache: "no-store" });
}

/** Read-only variant for Server Components, which cannot persist refreshed cookies. */
export async function storefrontAuthedFetchReadOnly(path: string, init?: RequestInit): Promise<Response> {
  return doFetch(path, init);
}

/**
 * Route Handler fetch to Nest with tenant host + customer JWT from cookies.
 * On **401**, tries once to rotate tokens via refresh cookie (`POST /auth/refresh`), then retries.
 */
export async function storefrontAuthedFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await doFetch(path, init);
  if (res.status !== 401) return res;
  const rotated = await refreshCustomerTokensFromCookies();
  if (!rotated) return res;
  return doFetch(path, init);
}
