import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyNestResponse(await storefrontAuthedFetch(`/stock-alerts/${encodeURIComponent(id)}`, { method: "DELETE" }));
}
