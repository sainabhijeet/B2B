import type {
  AnnouncementStatus,
  AnnouncementType,
  Audience,
  DisplayLocation,
} from '@/lib/announcementsDemoData';

export type AnnouncementFormState = {
  title: string;
  message: string;
  type: AnnouncementType;
  audience: Audience;
  audienceNote: string;
  displayLocations: DisplayLocation[];
  startDate: string;
  endDate: string;
  status: AnnouncementStatus;
};

export const ALL_LOCATIONS: DisplayLocation[] = [
  'distributor_dashboard',
  'admin_panel',
  'app_notification',
  'website_banner',
];

export function toggleLocation(list: DisplayLocation[], loc: DisplayLocation): DisplayLocation[] {
  if (list.includes(loc)) return list.filter((x) => x !== loc);
  return [...list, loc];
}
