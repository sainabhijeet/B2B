import { apiGet, apiPatch } from "@/lib/apiClient";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  entityType: string | null;
  entityId: string | null;
  metadataJson: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

type Envelope<T> = { success: boolean; data: T };

export async function listNotifications(): Promise<AppNotification[]> {
  const response = await apiGet<Envelope<AppNotification[]>>("/notifications");
  return response.data ?? [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiGet<Envelope<{ count: number }>>("/notifications/unread-count");
  return Number(response.data?.count ?? 0);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiPatch(`/notifications/${encodeURIComponent(id)}/read`, {});
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiPatch("/notifications/read-all", {});
}
