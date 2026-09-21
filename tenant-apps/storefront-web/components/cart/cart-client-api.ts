import type { CartApiEnvelope } from "@/lib/cart-types";

export async function getCartEnvelope(): Promise<{ res: Response; body: CartApiEnvelope }> {
  const res = await fetch("/api/storefront/cart", { cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as CartApiEnvelope;
  return { res, body };
}

export function lineSubtotal(item: { quantity: number; priceSnapshot: string }): number {
  const u = Number.parseFloat(item.priceSnapshot);
  const unit = Number.isFinite(u) ? u : 0;
  return unit * item.quantity;
}
