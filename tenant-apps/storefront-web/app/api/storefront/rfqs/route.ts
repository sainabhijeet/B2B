import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null) as Record<string, unknown> | null;
  const productId = typeof raw?.productId === "string" ? raw.productId.trim() : "";
  const productName = typeof raw?.productName === "string" ? raw.productName.trim() : "";
  const quantity = Number(raw?.quantity);
  const targetPrice = raw?.targetPrice == null || raw.targetPrice === "" ? undefined : Number(raw.targetPrice);
  const message = typeof raw?.message === "string" ? raw.message.trim().slice(0, 2000) : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId) ||
      !productName || !Number.isInteger(quantity) || quantity < 1 || quantity > 999999 ||
      (targetPrice !== undefined && (!Number.isFinite(targetPrice) || targetPrice <= 0))) {
    return Response.json({ message: "Invalid quote request." }, { status: 400 });
  }
  return proxyNestResponse(await storefrontAuthedFetch("/rfqs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, productName, quantity, ...(targetPrice !== undefined ? { targetPrice } : {}), ...(message ? { message } : {}) }),
  }));
}
