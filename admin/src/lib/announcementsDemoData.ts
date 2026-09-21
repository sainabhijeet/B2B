/** Demo — maps to announcements, announcement_targets. */

export type AnnouncementType = 'information' | 'warning' | 'maintenance' | 'promotion';

export type Audience = 'all_tenants' | 'free_plan' | 'paid_plan' | 'specific_tenant' | 'admin_users';

export type DisplayLocation = 'distributor_dashboard' | 'admin_panel' | 'app_notification' | 'website_banner';

export type AnnouncementStatus = 'active' | 'draft' | 'disabled';

export type AnnouncementRow = {
  announcementId: string;
  title: string;
  message: string;
  type: AnnouncementType;
  audience: Audience;
  /** e.g. tenant name when audience is specific_tenant */
  audienceNote: string;
  displayLocations: DisplayLocation[];
  startDate: string;
  endDate: string;
  status: AnnouncementStatus;
  createdBy: string;
  createdAt: string;
};

export type AnnouncementHistoryRow = {
  id: string;
  title: string;
  audienceLabel: string;
  createdAt: string;
  status: string;
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  all_tenants: 'All tenants',
  free_plan: 'Free plan users',
  paid_plan: 'Paid plan users',
  specific_tenant: 'Specific tenant',
  admin_users: 'Admin users',
};

export const LOCATION_LABELS: Record<DisplayLocation, string> = {
  distributor_dashboard: 'Distributor dashboard',
  admin_panel: 'Admin panel',
  app_notification: 'App notification',
  website_banner: 'Website banner',
};

export const TYPE_LABELS: Record<AnnouncementType, string> = {
  information: 'Information',
  warning: 'Warning',
  maintenance: 'Maintenance',
  promotion: 'Promotion',
};

export const INITIAL_ANNOUNCEMENTS: AnnouncementRow[] = [
  {
    announcementId: 'an-1',
    title: 'Platform maintenance scheduled',
    message: 'Platform will be under maintenance from 2 AM to 4 AM IST. Expect brief API delays.',
    type: 'maintenance',
    audience: 'all_tenants',
    audienceNote: '',
    displayLocations: ['distributor_dashboard', 'website_banner', 'app_notification'],
    startDate: '2026-04-11',
    endDate: '2026-04-12',
    status: 'active',
    createdBy: 'Deepak',
    createdAt: '2026-04-10T09:00:00+05:30',
  },
  {
    announcementId: 'an-2',
    title: 'New coupon feature released',
    message: 'Coupons module is now available on the Premium plan. Enable it under Commerce settings.',
    type: 'promotion',
    audience: 'paid_plan',
    audienceNote: '',
    displayLocations: ['distributor_dashboard', 'admin_panel'],
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    status: 'active',
    createdBy: 'Neha Gupta',
    createdAt: '2026-04-01T11:00:00+05:30',
  },
  {
    announcementId: 'an-3',
    title: 'Security update — rotate API keys',
    message: 'Please rotate legacy API keys by 30 Apr. See security bulletin #42.',
    type: 'warning',
    audience: 'admin_users',
    audienceNote: '',
    displayLocations: ['admin_panel', 'app_notification'],
    startDate: '2026-04-08',
    endDate: '2026-04-30',
    status: 'active',
    createdBy: 'System',
    createdAt: '2026-04-08T08:00:00+05:30',
  },
  {
    announcementId: 'an-4',
    title: 'Upgrade promotion — Free to Basic',
    message: '20% off first month when upgrading from Free to Basic. Use code SPRING26.',
    type: 'promotion',
    audience: 'free_plan',
    audienceNote: '',
    displayLocations: ['website_banner', 'app_notification'],
    startDate: '2026-04-10',
    endDate: '2026-04-20',
    status: 'draft',
    createdBy: 'Marketing',
    createdAt: '2026-04-10T14:00:00+05:30',
  },
];

export const INITIAL_ANNOUNCEMENT_HISTORY: AnnouncementHistoryRow[] = [
  {
    id: 'ah-1',
    title: 'Feature launch — Loyalty points',
    audienceLabel: 'Premium tenants',
    createdAt: '2026-01-12',
    status: 'Ended',
  },
  {
    id: 'ah-2',
    title: 'Holiday notice',
    audienceLabel: 'All tenants',
    createdAt: '2025-12-20',
    status: 'Ended',
  },
  {
    id: 'ah-3',
    title: 'Subscription renewal reminder',
    audienceLabel: 'Paid plan users',
    createdAt: '2025-11-05',
    status: 'Ended',
  },
];

export type AnnouncementSettings = {
  maxActiveAnnouncements: number;
  bannerDisplayDurationSec: number;
  autoExpire: boolean;
};

export const DEFAULT_ANNOUNCEMENT_SETTINGS: AnnouncementSettings = {
  maxActiveAnnouncements: 3,
  bannerDisplayDurationSec: 30,
  autoExpire: true,
};
