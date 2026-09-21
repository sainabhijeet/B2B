/** Identifies who owns a WhatsApp quick-order session (real customer vs provisional lead). */
export type WaSessionOwner =
  | { customerId: string; tempCustomerId?: undefined }
  | { tempCustomerId: string; customerId?: undefined };
