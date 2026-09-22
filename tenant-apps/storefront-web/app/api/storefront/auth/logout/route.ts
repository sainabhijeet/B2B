import { cookies } from "next/headers";
import { apiBaseUrl } from "@/lib/api-origin";
import {
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_DEVICE_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
} from "@/lib/customer-session-cookies";

/** Clears storefront customer session cookies; redirects home when opened as an HTML form POST. */
export async function POST(req: Request) {
  const jar = await cookies();
  const accessToken = jar.get(CUSTOMER_ACCESS_COOKIE)?.value;
  const refreshToken = jar.get(CUSTOMER_REFRESH_COOKIE)?.value;
  const deviceId = jar.get(CUSTOMER_DEVICE_COOKIE)?.value;

  if (accessToken && refreshToken && deviceId) {
    try {
      await fetch(`${apiBaseUrl()}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken, deviceId }),
        cache: "no-store",
      });
    } catch {
      // Local logout must still succeed if the API is temporarily unavailable.
    }
  }

  jar.delete(CUSTOMER_ACCESS_COOKIE);
  jar.delete(CUSTOMER_REFRESH_COOKIE);
  jar.delete(CUSTOMER_DEVICE_COOKIE);
  const origin = new URL(req.url).origin;
  return Response.redirect(`${origin}/`, 303);
}
