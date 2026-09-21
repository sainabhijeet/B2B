import { cookies, headers } from "next/headers";
import { apiBaseUrl } from "@/lib/api-origin";
import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies";
import { refreshCustomerTokensFromCookies } from "@/lib/server-customer-token-refresh";

async function doFetch(path: string, init?: RequestInit): Promise<Response> {
  const [cookieStore, h] = await Promise.all([cookies(), headers()]);
  const token = cookieStore.get(CUSTOMER_ACCESS_COOKIE)?.value;
  const browserHost = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const base = apiBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const reqHeaders = new Headers(init?.headers);
  if (token) reqHeaders.set("Authorization", `Bearer ${token}`);
  if (browserHost) reqHeaders.set("x-storefront-host", browserHost);
  return fetch(url, { ...init, headers: reqHeaders, cache: "no-store" });
}

/**
 * Server-side fetch to Nest with tenant host + customer JWT from cookies.
 * On **401**, tries once to rotate tokens via refresh cookie (`POST /auth/refresh`), then retries.
 */
export async function storefrontAuthedFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await doFetch(path, init);
  if (res.status !== 401) return res;
  const rotated = await refreshCustomerTokensFromCookies();
  if (!rotated) return res;
  return doFetch(path, init);
}
