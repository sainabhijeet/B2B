import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.text();
  return proxyNestResponse(
    await storefrontAuthedFetch(`/cart/items/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyNestResponse(await storefrontAuthedFetch(`/cart/items/${encodeURIComponent(id)}`, { method: "DELETE" }));
}
