import { apiBaseUrl } from "@/lib/api-origin";

function storefrontHostFrom(req: Request): string {
  return req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
}

/** Proxies OTP request to Nest (forwards tenant host). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  const host = storefrontHostFrom(req);
  const base = apiBaseUrl();
  const res = await fetch(`${base}/storefront/customer/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(host ? { "x-storefront-host": host } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}
