import { apiDelete, apiGet, apiPostForm } from '@/lib/apiClient';
import type { MediaFileRow } from '@/lib/mediaModels';

type ThemePreviewUploadEnvelope = {
  success?: boolean;
  data?: {
    url?: string;
    path?: string;
    fileName?: string;
  };
};

export async function uploadThemePreviewImage(file: File): Promise<{
  url: string;
  path: string;
  fileName: string;
}> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiPostForm<ThemePreviewUploadEnvelope>('/themes/preview-media/upload', form);
  const data = res.data;
  if (!data?.url || !data.fileName) {
    throw new Error('Upload succeeded but image URL was missing.');
  }
  return {
    url: data.url,
    path: data.path ?? data.url.replace(/^\/storage\//, ''),
    fileName: data.fileName,
  };
}

type MediaEnvelope<T> = { success?: boolean; data: T };

export async function fetchAdminMedia(): Promise<MediaFileRow[]> {
  const response = await apiGet<MediaEnvelope<MediaFileRow[]>>('/admin/media');
  return response.data ?? [];
}

export async function uploadAdminMedia(input: {
  file: File;
  folderId: string;
  module: string;
  tags: string;
  description: string;
}): Promise<MediaFileRow> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('folderId', input.folderId);
  form.append('module', input.module);
  form.append('tags', input.tags);
  form.append('description', input.description);
  const response = await apiPostForm<MediaEnvelope<MediaFileRow>>('/admin/media', form);
  return response.data;
}

export async function deleteAdminMedia(id: string): Promise<void> {
  await apiDelete(`/admin/media/${encodeURIComponent(id)}`);
}
