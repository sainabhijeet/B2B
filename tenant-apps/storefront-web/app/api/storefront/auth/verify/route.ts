import { cookies } from "next/headers";
import { apiBaseUrl } from "@/lib/api-origin";
import {
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_DEVICE_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
} from "@/lib/customer-session-cookies";
import { storefrontTenantHeadersFromRequest } from "@/lib/storefront-request-context";
import { tenantIdFromCustomerToken } from "@/lib/customer-token-tenant";

type VerifyBody = {
  mobile?: string;
  code?: string;
  deviceId?: string;
};

type TokenResponse = {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  user?: unknown;
  data?: TokenResponse;
  message?: string | string[];
};

function durationSeconds(value: string | undefined, fallback: number): number {
  const match = value?.trim().match(/^(\d+)\s*([smhd])$/iu);
  if (!match) return fallback;
  const amount = Number(match[1]);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  const unit = match[2].toLowerCase() as keyof typeof multipliers;
  return Number.isSafeInteger(amount) && amount > 0
    ? amount * multipliers[unit]
    : fallback;
}

/** Proxies OTP verify to Nest and sets HttpOnly session cookies (access + refresh + device). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as VerifyBody | null;
  const mobile = body?.mobile?.replace(/\D/gu, "") ?? "";
  const code = body?.code?.replace(/\D/gu, "") ?? "";
  const deviceId = body?.deviceId?.trim() ?? "";
  if (
    !/^\d{8,20}$/u.test(mobile) ||
    !/^\d{6}$/u.test(code) ||
    deviceId.length < 1 ||
    deviceId.length > 128
  ) {
    return Response.json(
      { message: "Valid mobile, 6-digit OTP, and device ID are required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}/storefront/customer/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...storefrontTenantHeadersFromRequest(req),
      },
      body: JSON.stringify({ mobile, code, deviceId }),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { message: "Login service is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
  const text = await res.text();
  let parsed: TokenResponse;
  try {
    parsed = JSON.parse(text) as TokenResponse;
  } catch {
    return new Response(text, {
      status: res.status,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (!res.ok) {
    return Response.json(parsed, {
      status: res.status,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const tokens = parsed.accessToken ? parsed : parsed.data;
  if (!tokens?.accessToken) {
    return Response.json(
      { message: "Login response did not include an access token." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
  const jar = await cookies();
  const common = {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  jar.set(CUSTOMER_ACCESS_COOKIE, tokens.accessToken, {
    ...common,
    maxAge: durationSeconds(tokens.expiresIn, 60 * 15),
  });
  if (tokens.refreshToken) {
    jar.set(CUSTOMER_REFRESH_COOKIE, tokens.refreshToken, {
      ...common,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  jar.set(CUSTOMER_DEVICE_COOKIE, deviceId, {
    ...common,
    maxAge: 60 * 60 * 24 * 30,
  });
  const tenantId = tenantIdFromCustomerToken(tokens.accessToken);
  if (tenantId) {
    jar.set("storefront_tenant_id", tenantId, { ...common, maxAge: 60 * 60 * 24 * 30 });
  }
  return Response.json(
    { success: true, user: tokens.user ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
