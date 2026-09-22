import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ message: "Invalid address details." }, { status: 400 });
  }

  try {
    return proxyNestResponse(await storefrontAuthedFetch("/storefront/customer/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));
  } catch {
    return Response.json({ message: "Address service is temporarily unavailable." }, { status: 502 });
  }
}
