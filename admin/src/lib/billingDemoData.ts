/** Demo — Super Admin SaaS subscription billing only (not distributor product orders). */

export type SubscriptionInvoiceStatus = 'paid' | 'pending' | 'overdue' | 'void';

export type SubscriptionInvoiceRow = {
  invoiceId: string;
  tenantId: string;
  distributorName: string;
  planId: string;
  planName: string;
  amount: number;
  tax: number;
  total: number;
  status: SubscriptionInvoiceStatus;
  createdAt: string;
  periodLabel: string;
};

export type SubscriptionPaymentRow = {
  paymentId: string;
  invoiceId: string;
  tenantId: string;
  distributorName: string;
  amount: number;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  paidAt: string;
};

export type PlanBillingRow = {
  tenantId: string;
  distributorName: string;
  planId: string;
  planName: string;
  billingCycle: string;
  mrr: number;
  nextRenewal: string;
  lastInvoiceId: string;
};

export type SubscriptionRefundRow = {
  refundId: string;
  invoiceId: string;
  tenantId: string;
  distributorName: string;
  amount: number;
  reason: string;
  status: 'completed' | 'pending';
  createdAt: string;
};

export const INITIAL_SUBSCRIPTION_INVOICES: SubscriptionInvoiceRow[] = [
  {
    invoiceId: 'INV-SA-1001',
    tenantId: 't-abc-traders',
    distributorName: 'ABC Traders',
    planId: 'pl-basic',
    planName: 'Basic',
    amount: 1694,
    tax: 305,
    total: 1999,
    status: 'paid',
    createdAt: '2026-04-01T10:00:00+05:30',
    periodLabel: 'Apr 2026',
  },
  {
    invoiceId: 'INV-SA-1002',
    tenantId: 't-metro-wholesale',
    distributorName: 'Metro Wholesale Co.',
    planId: 'pl-premium',
    planName: 'Premium',
    amount: 4237,
    tax: 762,
    total: 4999,
    status: 'pending',
    createdAt: '2026-04-08T09:15:00+05:30',
    periodLabel: 'Apr 2026',
  },
  {
    invoiceId: 'INV-SA-0998',
    tenantId: 't-north-partners',
    distributorName: 'North Region Partners',
    planId: 'pl-basic',
    planName: 'Basic',
    amount: 1694,
    tax: 305,
    total: 1999,
    status: 'overdue',
    createdAt: '2026-03-01T08:00:00+05:30',
    periodLabel: 'Mar 2026',
  },
];

export const INITIAL_SUBSCRIPTION_PAYMENTS: SubscriptionPaymentRow[] = [
  {
    paymentId: 'pay-sa-501',
    invoiceId: 'INV-SA-1001',
    tenantId: 't-abc-traders',
    distributorName: 'ABC Traders',
    amount: 1999,
    method: 'UPI',
    status: 'completed',
    paidAt: '2026-04-01T10:22:00+05:30',
  },
  {
    paymentId: 'pay-sa-502',
    invoiceId: 'INV-SA-0995',
    tenantId: 't-gamma-foods',
    distributorName: 'Gamma Foods',
    amount: 4999,
    method: 'Card',
    status: 'completed',
    paidAt: '2026-03-28T14:05:00+05:30',
  },
  {
    paymentId: 'pay-sa-503',
    invoiceId: 'INV-SA-1002',
    tenantId: 't-metro-wholesale',
    distributorName: 'Metro Wholesale Co.',
    amount: 4999,
    method: 'Netbanking',
    status: 'pending',
    paidAt: '2026-04-08T09:20:00+05:30',
  },
];

export const INITIAL_PLAN_BILLING: PlanBillingRow[] = [
  {
    tenantId: 't-abc-traders',
    distributorName: 'ABC Traders',
    planId: 'pl-basic',
    planName: 'Basic',
    billingCycle: 'Monthly',
    mrr: 1999,
    nextRenewal: '2026-05-01',
    lastInvoiceId: 'INV-SA-1001',
  },
  {
    tenantId: 't-metro-wholesale',
    distributorName: 'Metro Wholesale Co.',
    planId: 'pl-premium',
    planName: 'Premium',
    billingCycle: 'Monthly',
    mrr: 4999,
    nextRenewal: '2026-05-08',
    lastInvoiceId: 'INV-SA-1002',
  },
  {
    tenantId: 't-north-partners',
    distributorName: 'North Region Partners',
    planId: 'pl-basic',
    planName: 'Basic',
    billingCycle: 'Monthly',
    mrr: 1999,
    nextRenewal: '2026-04-01',
    lastInvoiceId: 'INV-SA-0998',
  },
];

export const INITIAL_SUBSCRIPTION_REFUNDS: SubscriptionRefundRow[] = [
  {
    refundId: 'rf-sa-01',
    invoiceId: 'INV-SA-0988',
    tenantId: 't-beta-labs',
    distributorName: 'Beta Labs',
    amount: 1999,
    reason: 'Plan cancelled within cooling period',
    status: 'completed',
    createdAt: '2026-03-15T11:00:00+05:30',
  },
  {
    refundId: 'rf-sa-02',
    invoiceId: 'INV-SA-0990',
    tenantId: 't-acme',
    distributorName: 'Acme Retail',
    amount: 999,
    reason: 'Duplicate charge — partial adjustment',
    status: 'pending',
    createdAt: '2026-04-02T16:30:00+05:30',
  },
];

export const SAAS_REVENUE_SUMMARY = {
  mrr: 184_200,
  arr: 2_210_400,
  collectedThisMonth: 412_800,
  outstanding: 45_600,
  refundExposure: 2_998,
};

export const SAAS_REVENUE_BY_PLAN = [
  { plan: 'Basic', mrr: 55_972, subscribers: 28 },
  { plan: 'Premium', mrr: 69_986, subscribers: 14 },
  { plan: 'Enterprise', mrr: 58_242, subscribers: 3 },
];

export const SAAS_REVENUE_TREND = [
  { month: 'Nov', subscription: 152000 },
  { month: 'Dec', subscription: 161000 },
  { month: 'Jan', subscription: 168000 },
  { month: 'Feb', subscription: 174000 },
  { month: 'Mar', subscription: 179000 },
  { month: 'Apr', subscription: 184200 },
];

export function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function invoiceStatusClass(s: SubscriptionInvoiceStatus): string {
  if (s === 'paid') return 'text-emerald-700';
  if (s === 'pending') return 'text-amber-800';
  if (s === 'overdue') return 'text-red-700';
  return 'text-slate-500';
}
