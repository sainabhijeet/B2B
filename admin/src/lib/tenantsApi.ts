import { apiGet, apiPost } from '@/lib/apiClient';
import type { TenantListRow, TenantStatus } from '@/lib/tenantDemoData';

export type TenantFromApi = {
  id: string;
  slug: string;
  name: string;
  status: string;
  planId: string | null;
  planCode: string | null;
  planName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  createdAt: string;
  updatedAt: string;
};

export function fetchTenants(): Promise<TenantFromApi[]> {
  return apiGet<TenantFromApi[]>('/tenants');
}

function planFromApiName(name: string | null): TenantListRow['plan'] {
  const n = (name ?? 'Free').trim().toLowerCase();
  if (n === 'enterprise') return 'Enterprise';
  if (n === 'premium') return 'Premium';
  if (n === 'basic') return 'Basic';
  return 'Free';
}

function statusFromApi(s: string): TenantStatus {
  if (s === 'suspended') return 'suspended';
  if (s === 'active') return 'active';
  return 'active';
}

/** Maps API tenant list row to the table shape used by TenantListPage. */
export function mapTenantApiToListRow(t: TenantFromApi): TenantListRow {
  const email = t.ownerEmail?.trim() ?? '';
  const local = email.includes('@') ? email.split('@')[0] : email;
  const ownerLabel =
    local.length > 0
      ? local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : '—';

  return {
    id: t.id,
    businessName: t.name,
    ownerName: ownerLabel,
    email: email || '—',
    phone: t.ownerPhone?.trim() || '—',
    domain: t.slug ? `${t.slug}.store` : '—',
    plan: planFromApiName(t.planName),
    status: statusFromApi(t.status),
    createdAt: t.createdAt.slice(0, 10),
  };
}

export type TenantDetailFromApi = {
  id: string;
  slug: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  plan: {
    id: string;
    code: string;
    name: string;
    price: number;
    billingCycle: string;
  } | null;
  owner: { email: string | null; phone: string | null } | null;
  subscription: {
    id: string;
    planName: string;
    planId: string | null;
    status: string;
    startDate: string;
    expiryDate: string | null;
    endDate: string | null;
    trialEndsAt: string | null;
  } | null;
};

export function fetchTenantDetail(id: string): Promise<TenantDetailFromApi> {
  return apiGet<TenantDetailFromApi>(`/tenants/${encodeURIComponent(id)}`);
}

export type TenantUsageFromApi = {
  products: number;
  customers: number;
  orders: number;
  users: number;
  storageBytes: number;
  apiCalls30d: number;
  notifications30d: number;
  notificationsToday: number;
  limits: {
    maxProducts: number;
    maxUsers: number;
    notificationsPerDay: number;
  } | null;
};

export function fetchTenantUsage(id: string): Promise<TenantUsageFromApi> {
  return apiGet<{ data: TenantUsageFromApi }>(
    `/tenants/${encodeURIComponent(id)}/usage`,
  ).then((body) => body.data);
}

export type TenantHandoffResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; role: string; tenantId: string | null };
};

export function createTenantHandoff(tenantId: string, deviceId: string): Promise<TenantHandoffResponse> {
  return apiPost<TenantHandoffResponse>('/auth/admin/tenant-handoff', { tenantId, deviceId });
}

export function ownerDisplayName(owner: TenantDetailFromApi['owner']): string {
  const email = owner?.email?.trim() ?? '';
  if (!email) return '—';
  if (!email.includes('@')) return email;
  const local = email.split('@')[0];
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatPlanPrice(plan: TenantDetailFromApi['plan']): string {
  if (!plan) return '—';
  const c = plan.code.toUpperCase();
  if (c === 'FREE') return '₹0';
  return `₹${plan.price.toLocaleString('en-IN')}`;
}

export function billingCycleLabel(cycle: string): string {
  if (cycle === 'MONTHLY') return 'Monthly';
  if (cycle === 'YEARLY') return 'Yearly';
  return cycle;
}
