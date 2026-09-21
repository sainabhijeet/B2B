export type ReorderSuggestionDto = {
  variantId: string;
  name: string;
  lastQty: number;
  suggestedQty: number;
  /** Median days between buys when 2+ orders exist; else default from config. */
  intervalDays: number;
  lastOrderedAt: string;
  /** First calendar day the SKU is considered “due” again. */
  nextDueAt: string;
  confidence: 'pattern' | 'default';
  /** Optional: available units after reservations (inventory hint). */
  stockAvailable?: number;
};

export type CustomerReorderSuggestionsRowDto = {
  customerId: string;
  customerName: string;
  suggestionCount: number;
  suggestions: ReorderSuggestionDto[];
};

export type TenantReorderSuggestionsAnalyticsDto = {
  customers: CustomerReorderSuggestionsRowDto[];
  totalCustomersWithSuggestions: number;
};
