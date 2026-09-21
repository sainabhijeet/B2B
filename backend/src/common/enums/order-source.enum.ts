/** How the order was originated (tenant `orders.order_source`). */
export enum OrderSource {
  STOREFRONT = 'STOREFRONT',
  /** Storefront order created from an isolated Buy Now checkout (no cart mutation). */
  BUY_NOW = 'BUY_NOW',
  WHATSAPP = 'WHATSAPP',
  MANUAL = 'MANUAL',
}
