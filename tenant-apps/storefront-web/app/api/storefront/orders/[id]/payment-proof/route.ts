import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const form = await req.formData();
  return proxyNestResponse(
    await storefrontAuthedFetch(`/orders/${encodeURIComponent(id)}/payment-proof/upload`, {
      method: "POST",
      body: form,
    }),
  );
}
