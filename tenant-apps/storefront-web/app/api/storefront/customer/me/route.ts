import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

export async function GET() {
  return proxyNestResponse(await storefrontAuthedFetch("/storefront/customer/me"));
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ message: "Invalid profile details." }, { status: 400 });
  }
  return proxyNestResponse(await storefrontAuthedFetch("/storefront/customer/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}
