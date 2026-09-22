import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const raw = await req.text();
  return proxyNestResponse(
    await storefrontAuthedFetch(`/orders/${encodeURIComponent(id)}/razorpay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw && raw.trim() ? raw : "{}",
    }),
  );
}
