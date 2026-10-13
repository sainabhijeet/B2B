export type CreditTransaction = {
  id: string;
  type: string;
  amount: string | number;
  referenceType: string;
  referenceId: string | null;
  balanceAfter: string | number;
  createdAt: string;
};

export type CreditLedgerEnvelope = {
  success?: boolean;
  data?: CreditTransaction[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
  };
  message?: string | string[];
};
