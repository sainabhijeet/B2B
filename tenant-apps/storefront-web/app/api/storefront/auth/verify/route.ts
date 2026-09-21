import { cookies } from "next/headers";
import { apiBaseUrl } from "@/lib/api-origin";
import {
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_DEVICE_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
} from "@/lib/customer-session-cookies";

function storefrontHost(req: Request): string {
  return req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
}

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
};

/** Proxies OTP verify to Nest and sets HttpOnly session cookies (access + refresh + device). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as VerifyBody | null;
  if (!body?.mobile || !body.code || !body.deviceId) {
    return Response.json(
      { message: "mobile, code (6 digits), and deviceId are required." },
      { status: 400 },
    );
  }
  const base = apiBaseUrl();
  const host = storefrontHost(req);
  const res = await fetch(`${base}/storefront/customer/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(host ? { "x-storefront-host": host } : {}),
    },
    body: JSON.stringify({
      mobile: body.mobile,
      code: body.code,
      deviceId: body.deviceId,
    }),
  });
  const text = await res.text();
  let parsed: TokenResponse;
  try {
    parsed = JSON.parse(text) as TokenResponse;
  } catch {
    return new Response(text, { status: res.status });
  }
  if (!res.ok) {
    return Response.json(parsed, { status: res.status });
  }
  if (!parsed.accessToken) {
    return Response.json({ message: "No access token from API." }, { status: 502 });
  }
  const jar = await cookies();
  const common = {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  jar.set(CUSTOMER_ACCESS_COOKIE, parsed.accessToken, { ...common, maxAge: 60 * 60 * 12 });
  if (parsed.refreshToken) {
    jar.set(CUSTOMER_REFRESH_COOKIE, parsed.refreshToken, { ...common, maxAge: 60 * 60 * 24 * 30 });
  }
  jar.set(CUSTOMER_DEVICE_COOKIE, body.deviceId, { ...common, maxAge: 60 * 60 * 24 * 30 });
  return Response.json({ success: true, user: parsed.user ?? null });
}
