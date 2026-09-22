import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function DELETE(_request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  if (!UUID.test(productId)) {
    return Response.json({ message: "Invalid product." }, { status: 400 });
  }
  return proxyNestResponse(await storefrontAuthedFetch(`/wishlist/items/${encodeURIComponent(productId)}`, {
    method: "DELETE",
  }));
}
