import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as { productId?: unknown } | null;
  const productId = typeof payload?.productId === "string" ? payload.productId.trim() : "";
  if (!UUID.test(productId)) {
    return Response.json({ message: "Invalid product." }, { status: 400 });
  }
  return proxyNestResponse(await storefrontAuthedFetch("/wishlist/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  }));
}
