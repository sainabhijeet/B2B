/**
 * Cart lines — replace with `GET/POST /api/v1/cart` + customer session.
 */
export type CartLine = { sku: string; title: string; quantity: number; lineTotal: number };

export async function getDemoCart(): Promise<CartLine[]> {
  return [
    { sku: "DEMO-1", title: "Demo SKU — sample", quantity: 1, lineTotal: 999 },
    { sku: "DEMO-2", title: "Demo SKU — sample B", quantity: 2, lineTotal: 1998 },
  ];
}
