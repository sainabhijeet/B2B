import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const quantity = Number.parseInt(new URL(request.url).searchParams.get("qty") ?? "1", 10);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999999) {
    return Response.json({ message: "Invalid quantity." }, { status: 400 });
  }
  return proxyNestResponse(
    await storefrontAuthedFetch(`/storefront/products/${encodeURIComponent(slug)}?qty=${quantity}`),
  );
}
