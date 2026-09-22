import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyNestResponse(
    await storefrontAuthedFetch(`/orders/${encodeURIComponent(id)}/razorpay/abandon`, { method: "POST" }),
  );
}
