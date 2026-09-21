/** Demo — maps to media_files, media_folders; CDN paths illustrative. */

export type MediaFileType = 'image' | 'document' | 'video' | 'archive' | 'other';

export type FileVisibility = 'public' | 'private' | 'signed';

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
  visibility: FileVisibility;
  tags: string[];
  description: string;
};

export type MediaFolderRow = {
  folderId: string;
  folderName: string;
  parentId: string | null;
};

export type StorageGrowthPoint = { label: string; usedGb: number };

export const INITIAL_FOLDERS: MediaFolderRow[] = [
  { folderId: 'root', folderName: 'media', parentId: null },
  { folderId: 'fld-tenants', folderName: 'tenants', parentId: 'root' },
  { folderId: 'fld-products', folderName: 'products', parentId: 'root' },
  { folderId: 'fld-categories', folderName: 'categories', parentId: 'root' },
  { folderId: 'fld-ads', folderName: 'ads', parentId: 'root' },
  { folderId: 'fld-themes', folderName: 'themes', parentId: 'root' },
  { folderId: 'fld-documents', folderName: 'documents', parentId: 'root' },
];

export const INITIAL_MEDIA_FILES: MediaFileRow[] = [
  {
    fileId: 'mf-1',
    fileName: 'ridego-hero-route.svg',
    filePath: '/storage/themes/web/ridegoo/assets/images/hero-route.svg',
    fileType: 'image',
    fileSizeBytes: 122880,
    module: 'Themes',
    uploadedBy: 'System',
    createdAt: '2026-04-10T09:30:00+05:30',
    folderId: 'fld-themes',
    visibility: 'public',
    tags: ['theme', 'preview'],
    description: 'RideGo theme hero preview',
  },
  {
    fileId: 'mf-2',
    fileName: 'ridego-dashboard.svg',
    filePath: '/storage/themes/web/ridegoo/assets/images/route-dashboard.svg',
    fileType: 'image',
    fileSizeBytes: 345600,
    module: 'Themes',
    uploadedBy: 'System',
    createdAt: '2026-04-09T14:00:00+05:30',
    folderId: 'fld-themes',
    visibility: 'public',
    tags: ['theme', 'preview'],
    description: 'RideGo dashboard preview',
  },
  {
    fileId: 'mf-3',
    fileName: 'product_thumb_12.webp',
    filePath: '/media/products/product_thumb_12.webp',
    fileType: 'image',
    fileSizeBytes: 48128,
    module: 'Catalog',
    uploadedBy: 'System',
    createdAt: '2026-04-08T11:15:00+05:30',
    folderId: 'fld-products',
    visibility: 'public',
    tags: ['product'],
    description: '',
  },
  {
    fileId: 'mf-4',
    fileName: 'summer_sale_hero.jpg',
    filePath: '/media/ads/summer_sale_hero.jpg',
    fileType: 'image',
    fileSizeBytes: 892000,
    module: 'Ads',
    uploadedBy: 'Neha Gupta',
    createdAt: '2026-04-07T16:45:00+05:30',
    folderId: 'fld-ads',
    visibility: 'public',
    tags: ['campaign'],
    description: 'Ad creative',
  },
  {
    fileId: 'mf-5',
    fileName: 'theme_base.css.zip',
    filePath: '/media/themes/theme_base.css.zip',
    fileType: 'archive',
    fileSizeBytes: 1204000,
    module: 'Themes',
    uploadedBy: 'Arjun Mehta',
    createdAt: '2026-04-06T10:00:00+05:30',
    folderId: 'fld-themes',
    visibility: 'private',
    tags: ['theme', 'bundle'],
    description: 'Packaged theme assets',
  },
  {
    fileId: 'mf-6',
    fileName: 'invoice_template.pdf',
    filePath: '/media/documents/invoice_template.pdf',
    fileType: 'document',
    fileSizeBytes: 240512,
    module: 'Billing',
    uploadedBy: 'Priya Nair',
    createdAt: '2026-04-05T13:20:00+05:30',
    folderId: 'fld-documents',
    visibility: 'private',
    tags: ['pdf', 'billing'],
    description: 'PDF invoice',
  },
  {
    fileId: 'mf-7',
    fileName: 'onboarding_clip.mp4',
    filePath: '/media/documents/onboarding_clip.mp4',
    fileType: 'video',
    fileSizeBytes: 12_500_000,
    module: 'Support',
    uploadedBy: 'Rahul Sharma',
    createdAt: '2026-04-04T09:00:00+05:30',
    folderId: 'fld-documents',
    visibility: 'signed',
    tags: ['video'],
    description: 'Help center clip',
  },
];

export const STORAGE_TOTAL_GB = 500;
export const STORAGE_USED_GB = 120;
export const STORAGE_FILE_COUNT = 240_000;

export const GROWTH_SERIES: StorageGrowthPoint[] = [
  { label: 'Nov', usedGb: 82 },
  { label: 'Dec', usedGb: 91 },
  { label: 'Jan', usedGb: 98 },
  { label: 'Feb', usedGb: 105 },
  { label: 'Mar', usedGb: 112 },
  { label: 'Apr', usedGb: 120 },
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function publicUrlForPath(filePath: string): string {
  if (/^https?:\/\//i.test(filePath) || filePath.startsWith('data:')) return filePath;
  if (filePath.startsWith('/storage/')) return filePath;
  if (filePath.startsWith('storage/')) return `/${filePath}`;
  return filePath;
}
