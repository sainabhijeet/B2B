export type MediaFileType = 'image' | 'video' | 'document' | 'archive' | 'other';
export type MediaFileRow = {
  fileId: string;
  fileName: string;
  filePath: string;
  fileType: MediaFileType;
  fileSizeBytes: number;
  module: string;
  uploadedBy: string;
  createdAt: string;
  folderId: string;
  visibility: 'public' | 'private';
  tags: string[];
  description: string;
};
export type MediaFolderRow = {
  folderId: string;
  folderName: string;
  parentId: string | null;
  module: string;
  fileCount: number;
};
export type StorageGrowthPoint = { label: string; usedGb: number };
export function publicUrlForPath(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unit;
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}
