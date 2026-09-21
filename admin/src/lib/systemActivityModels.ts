import type { SystemActivityItem } from '@/lib/adminConsoleApi';

export type ActivityCategory = SystemActivityItem['category'];

export const EMPTY_ACTIVITY_STATS = {
  newTenantsToday: 0,
  newBuildsToday: 0,
  productsAddedToday: 0,
  notificationsSentToday: 0,
};

export function activityModules(items: SystemActivityItem[]): string[] {
  return ['All', ...new Set(items.map((item) => item.module).filter(Boolean))];
}

export function categoryLabel(category: ActivityCategory): string {
  return {
    tenant: 'Tenant',
    admin: 'Admin',
    system: 'System',
    security: 'Security',
  }[category];
}

export function categoryBadgeClass(category: ActivityCategory): string {
  return {
    tenant: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    admin: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    system: 'bg-slate-100 text-slate-800 border-slate-200',
    security: 'bg-amber-100 text-amber-900 border-amber-200',
  }[category];
}
