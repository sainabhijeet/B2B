export type CartProductSummary = { id: string; name: string; slug?: string; taxRate?: string };
export type CartVariantSummary = { id: string; variantSku: string } | null;

export type CartLineItem = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  priceSnapshot: string;
  /** Resolved GST % from API when present (else use `product.taxRate`). */
  taxRate?: string | null;
  product?: CartProductSummary;
  variant?: CartVariantSummary;
};

export type CartApiEnvelope = {
  success?: boolean;
  data?: { cart?: { id: string }; items?: CartLineItem[] };
  message?: string;
};
