import {
  createAllFeaturesEnabled,
  createDefaultFeatureState,
} from '@/lib/platformFeatureRegistry';

export type PlanStatus = 'active' | 'hidden' | 'disabled';

export type PlanListRow = {
  id: string;
  name: string;
  priceDisplay: string;
  billingCycle: 'Monthly' | 'Quarterly' | 'Yearly';
  activeTenants: number;
  status: PlanStatus;
  createdAt: string;
};

export const PLAN_LIST_ROWS: PlanListRow[] = [
  {
    id: 'pl-free',
    name: 'Free',
    priceDisplay: '₹0',
    billingCycle: 'Monthly',
    activeTenants: 42,
    status: 'active',
    createdAt: '2025-08-01',
  },
  {
    id: 'pl-basic',
    name: 'Basic',
    priceDisplay: '₹999',
    billingCycle: 'Monthly',
    activeTenants: 28,
    status: 'active',
    createdAt: '2025-08-01',
  },
  {
    id: 'pl-premium',
    name: 'Premium',
    priceDisplay: '₹4,999',
    billingCycle: 'Monthly',
    activeTenants: 14,
    status: 'active',
    createdAt: '2025-08-01',
  },
  {
    id: 'pl-enterprise',
    name: 'Enterprise',
    priceDisplay: 'Custom',
    billingCycle: 'Yearly',
    activeTenants: 3,
    status: 'hidden',
    createdAt: '2026-01-10',
  },
];

export type BillingCycle = 'Monthly' | 'Quarterly' | 'Yearly';

export type PlanFormState = {
  basic: {
    name: string;
    description: string;
    price: string;
    currency: string;
    billingCycle: BillingCycle;
    trialDays: string;
    status: PlanStatus;
  };
  /** Keys from platformFeatureRegistry — backend sync friendly */
  features: Record<string, boolean>;
  limits: {
    maxProducts: string;
    maxCustomers: string;
    maxWarehouses: string;
    maxStaff: string;
    maxNotificationsMonth: string;
    maxApiPerDay: string;
    storageLimit: string;
  };
  build: {
    maxBuildsPerMonth: string;
    priority: 'normal' | 'priority';
  };
  billing: {
    discountPercent: string;
    taxPercent: string;
    renewalReminderDays: string;
    gracePeriodDays: string;
  };
};

const PRESET: Record<string, PlanFormState> = {
  'pl-free': {
    basic: {
      name: 'Free',
      description: 'Starter for small distributors.',
      price: '0',
      currency: 'INR',
      billingCycle: 'Monthly',
      trialDays: '0',
      status: 'active',
    },
    features: {
      ...createDefaultFeatureState(),
      products_catalog: true,
      categories_attributes: true,
      orders_management: true,
      customers_crm: true,
      warehouses_inventory: true,
      invoices_documents: true,
      module_analytics: true,
    },
    limits: {
      maxProducts: '100',
      maxCustomers: '500',
      maxWarehouses: '1',
      maxStaff: '2',
      maxNotificationsMonth: '100',
      maxApiPerDay: '1000',
      storageLimit: '1 GB',
    },
    build: { maxBuildsPerMonth: '2', priority: 'normal' },
    billing: {
      discountPercent: '0',
      taxPercent: '18',
      renewalReminderDays: '3',
      gracePeriodDays: '7',
    },
  },
  'pl-basic': {
    basic: {
      name: 'Basic',
      description: 'Growing businesses — more products & API.',
      price: '999',
      currency: 'INR',
      billingCycle: 'Monthly',
      trialDays: '7',
      status: 'active',
    },
    features: {
      ...createDefaultFeatureState(),
      products_catalog: true,
      categories_attributes: true,
      orders_management: true,
      customers_crm: true,
      warehouses_inventory: true,
      invoices_documents: true,
      custom_domain: true,
      customer_specific_pricing: true,
      coupons_offers: true,
      module_analytics: true,
      advanced_reports: true,
      api_access: true,
      module_themes: true,
      push_email_sms: true,
      staff_roles: true,
    },
    limits: {
      maxProducts: '5000',
      maxCustomers: '10000',
      maxWarehouses: '3',
      maxStaff: '10',
      maxNotificationsMonth: '1000',
      maxApiPerDay: '10000',
      storageLimit: '10 GB',
    },
    build: { maxBuildsPerMonth: '8', priority: 'normal' },
    billing: {
      discountPercent: '0',
      taxPercent: '18',
      renewalReminderDays: '7',
      gracePeriodDays: '7',
    },
  },
  'pl-premium': {
    basic: {
      name: 'Premium',
      description: 'Full platform — priority builds & unlimited scale.',
      price: '4999',
      currency: 'INR',
      billingCycle: 'Monthly',
      trialDays: '14',
      status: 'active',
    },
    features: {
      ...createDefaultFeatureState(),
      products_catalog: true,
      categories_attributes: true,
      orders_management: true,
      customers_crm: true,
      warehouses_inventory: true,
      invoices_documents: true,
      custom_domain: true,
      customer_specific_pricing: true,
      bulk_pricing: true,
      coupons_offers: true,
      module_analytics: true,
      advanced_reports: true,
      module_ads: true,
      module_referrals: true,
      api_access: true,
      webhooks: true,
      module_themes: true,
      module_app_builds: true,
      module_support: true,
      staff_roles: true,
      audit_logs: true,
      push_email_sms: true,
      translations: true,
      billing_portal: true,
    },
    limits: {
      maxProducts: 'Unlimited',
      maxCustomers: 'Unlimited',
      maxWarehouses: 'Unlimited',
      maxStaff: 'Unlimited',
      maxNotificationsMonth: 'Unlimited',
      maxApiPerDay: 'Unlimited',
      storageLimit: '50 GB',
    },
    build: { maxBuildsPerMonth: 'Unlimited', priority: 'priority' },
    billing: {
      discountPercent: '0',
      taxPercent: '18',
      renewalReminderDays: '14',
      gracePeriodDays: '14',
    },
  },
  'pl-enterprise': {
    basic: {
      name: 'Enterprise',
      description: 'Custom SLA, dedicated support.',
      price: '0',
      currency: 'INR',
      billingCycle: 'Yearly',
      trialDays: '30',
      status: 'hidden',
    },
    features: createAllFeaturesEnabled(),
    limits: {
      maxProducts: 'Unlimited',
      maxCustomers: 'Unlimited',
      maxWarehouses: 'Unlimited',
      maxStaff: 'Unlimited',
      maxNotificationsMonth: 'Unlimited',
      maxApiPerDay: 'Unlimited',
      storageLimit: 'Custom',
    },
    build: { maxBuildsPerMonth: 'Unlimited', priority: 'priority' },
    billing: {
      discountPercent: '0',
      taxPercent: '18',
      renewalReminderDays: '30',
      gracePeriodDays: '30',
    },
  },
};

export function getDefaultPlanForm(): PlanFormState {
  return {
    basic: {
      name: '',
      description: '',
      price: '0',
      currency: 'INR',
      billingCycle: 'Monthly',
      trialDays: '0',
      status: 'active',
    },
    features: { ...createDefaultFeatureState() },
    limits: {
      maxProducts: '',
      maxCustomers: '',
      maxWarehouses: '',
      maxStaff: '',
      maxNotificationsMonth: '',
      maxApiPerDay: '',
      storageLimit: '',
    },
    build: { maxBuildsPerMonth: '4', priority: 'normal' },
    billing: {
      discountPercent: '0',
      taxPercent: '18',
      renewalReminderDays: '7',
      gracePeriodDays: '7',
    },
  };
}

export function getPlanFormState(id: string | undefined): PlanFormState {
  if (id && PRESET[id]) {
    return JSON.parse(JSON.stringify(PRESET[id])) as PlanFormState;
  }
  return getDefaultPlanForm();
}

export type MatrixRow = { feature: string; free: string; basic: string; premium: string };

export const PLAN_FEATURE_MATRIX: MatrixRow[] = [
  { feature: 'Products', free: '100', basic: '5,000', premium: 'Unlimited' },
  { feature: 'Customers', free: '500', basic: '10,000', premium: 'Unlimited' },
  { feature: 'Notifications / mo', free: '100', basic: '1,000', premium: 'Unlimited' },
  { feature: 'API access', free: '❌', basic: '✔', premium: '✔' },
  { feature: 'Custom domain', free: '❌', basic: '✔', premium: '✔' },
  { feature: 'Analytics', free: 'Basic', basic: 'Advanced', premium: 'Advanced' },
  { feature: 'Storage', free: '1 GB', basic: '10 GB', premium: '50 GB' },
];
