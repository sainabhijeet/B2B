import { apiBaseUrl } from "@/lib/api-origin";
import { storefrontTenantHeadersFromRequest } from "@/lib/storefront-request-context";

type LoginBody = { mobile?: unknown };

function noStoreJson(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Proxies OTP request to Nest (forwards tenant host). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as LoginBody | null;
  const mobile =
    typeof body?.mobile === "string" ? body.mobile.replace(/\D/gu, "") : "";
  if (!/^\d{8,20}$/u.test(mobile)) {
    return noStoreJson({ message: "Enter a valid mobile number." }, 400);
  }

  try {
    const res = await fetch(`${apiBaseUrl()}/storefront/customer/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...storefrontTenantHeadersFromRequest(req),
      },
      body: JSON.stringify({ mobile }),
      cache: "no-store",
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return noStoreJson(
      { message: "Login service is temporarily unavailable." },
      502,
    );
  }
}
