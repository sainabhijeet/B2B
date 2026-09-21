import { apiGet } from '@/lib/apiClient';
import type { NotificationLogRow } from '@/lib/notificationTemplateModels';

type Envelope<T> = { data: T };

export async function fetchAdminNotificationLogs(limit = 500): Promise<NotificationLogRow[]> {
  const response = await apiGet<Envelope<NotificationLogRow[]>>(
    `/admin/notifications/logs?limit=${limit}`,
  );
  return response.data ?? [];
}
