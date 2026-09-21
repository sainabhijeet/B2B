/** Industries for global categories (platform-wide). */
export const CATEGORY_INDUSTRIES = [
  'Electronics',
  'Textile',
  'Footwear',
  'Industrial',
  'Diamond',
  'Machinery',
  'Retail',
] as const;

export type CategoryIndustry = (typeof CATEGORY_INDUSTRIES)[number] | string;

export type CategoryStatus = 'active' | 'inactive' | 'archived';

export type CategoryRow = {
  id: string;
  name: string;
  parentId: string | null;
  industry: CategoryIndustry;
  status: CategoryStatus;
  slug: string;
  sortOrder: number;
  createdAt: string;
  /** Linked attribute ids (category_attributes) */
  attributeIds: string[];
  showInApp: boolean;
  showInWebsite: boolean;
  showInMenu: boolean;
};

export { GLOBAL_ATTRIBUTE_OPTIONS } from '@/lib/attributeDemoData';

export const CATEGORY_ROWS: CategoryRow[] = [
  {
    id: 'cat-electronics',
    name: 'Electronics',
    parentId: null,
    industry: 'Electronics',
    status: 'active',
    slug: 'electronics',
    sortOrder: 1,
    createdAt: '2025-06-01',
    attributeIds: [],
    showInApp: true,
    showInWebsite: true,
    showInMenu: true,
  },
  {
    id: 'cat-footwear',
    name: 'Footwear',
    parentId: null,
    industry: 'Footwear',
    status: 'active',
    slug: 'footwear',
    sortOrder: 2,
    createdAt: '2025-06-01',
    attributeIds: [],
    showInApp: true,
    showInWebsite: true,
    showInMenu: true,
  },
  {
    id: 'cat-textile',
    name: 'Textile',
    parentId: null,
    industry: 'Textile',
    status: 'active',
    slug: 'textile',
    sortOrder: 3,
    createdAt: '2025-06-02',
    attributeIds: [],
    showInApp: true,
    showInWebsite: true,
    showInMenu: true,
  },
  {
    id: 'cat-industrial',
    name: 'Industrial equipment',
    parentId: null,
    industry: 'Industrial',
    status: 'inactive',
    slug: 'industrial-equipment',
    sortOrder: 4,
    createdAt: '2025-07-10',
    attributeIds: ['attr-voltage', 'attr-weight'],
    showInApp: false,
    showInWebsite: true,
    showInMenu: false,
  },
  {
    id: 'cat-mobile',
    name: 'Mobile',
    parentId: 'cat-electronics',
    industry: 'Electronics',
    status: 'active',
    slug: 'mobile',
    sortOrder: 1,
    createdAt: '2025-06-05',
    attributeIds: ['attr-ram', 'attr-storage', 'attr-battery', 'attr-processor'],
    showInApp: true,
    showInWebsite: true,
    showInMenu: true,
  },
  {
    id: 'cat-laptop',
    name: 'Laptop',
    parentId: 'cat-electronics',
    industry: 'Electronics',
    status: 'active',
    slug: 'laptop',
    sortOrder: 2,
    createdAt: '2025-06-05',
    attributeIds: ['attr-ram', 'attr-storage', 'attr-processor'],
    showInApp: true,
    showInWebsite: true,
    showInMenu: true,
  },
  {
    id: 'cat-accessories',
    name: 'Accessories',
    parentId: 'cat-electronics',
    industry: 'Electronics',
    status: 'archived',
    slug: 'mobile-accessories',
    sortOrder: 3,
    createdAt: '2025-06-06',
    attributeIds: ['attr-brand'],
    showInApp: true,
    showInWebsite: false,
    showInMenu: false,
  },
  {
    id: 'cat-safety-shoes',
    name: 'Safety Shoes',
    parentId: 'cat-footwear',
    industry: 'Industrial',
    status: 'active',
    slug: 'safety-shoes',
    sortOrder: 1,
    createdAt: '2025-08-12',
    attributeIds: ['attr-size', 'attr-color', 'attr-material', 'attr-brand'],
    showInApp: true,
    showInWebsite: true,
    showInMenu: true,
  },
  {
    id: 'cat-sports-shoes',
    name: 'Sports Shoes',
    parentId: 'cat-footwear',
    industry: 'Footwear',
    status: 'active',
    slug: 'sports-shoes',
    sortOrder: 2,
    createdAt: '2025-08-12',
    attributeIds: ['attr-size', 'attr-color', 'attr-brand'],
    showInApp: true,
    showInWebsite: true,
    showInMenu: true,
  },
  {
    id: 'cat-formal-shoes',
    name: 'Formal Shoes',
    parentId: 'cat-footwear',
    industry: 'Footwear',
    status: 'active',
    slug: 'formal-shoes',
    sortOrder: 3,
    createdAt: '2025-08-14',
    attributeIds: ['attr-size', 'attr-color', 'attr-material'],
    showInApp: true,
    showInWebsite: true,
    showInMenu: true,
  },
  {
    id: 'cat-diamond',
    name: 'Diamond loose',
    parentId: null,
    industry: 'Diamond',
    status: 'active',
    slug: 'diamond-loose',
    sortOrder: 10,
    createdAt: '2025-09-01',
    attributeIds: ['attr-brand'],
    showInApp: true,
    showInWebsite: true,
    showInMenu: true,
  },
  {
    id: 'cat-machinery',
    name: 'Heavy machinery',
    parentId: null,
    industry: 'Machinery',
    status: 'active',
    slug: 'heavy-machinery',
    sortOrder: 11,
    createdAt: '2025-10-20',
    attributeIds: ['attr-voltage', 'attr-weight', 'attr-brand'],
    showInApp: false,
    showInWebsite: true,
    showInMenu: true,
  },
];

export function getParentName(parentId: string | null): string {
  if (!parentId) return '—';
  const p = CATEGORY_ROWS.find((r) => r.id === parentId);
  return p?.name ?? parentId;
}

export type CategoryFormState = {
  name: string;
  parentId: string;
  industry: string;
  description: string;
  status: CategoryStatus;
  slug: string;
  sortOrder: string;
  attributeIds: string[];
  iconUrl: string;
  bannerUrl: string;
  thumbnailUrl: string;
  showInApp: boolean;
  showInWebsite: boolean;
  showInMenu: boolean;
};

export function rowToFormState(row: CategoryRow): CategoryFormState {
  return {
    name: row.name,
    parentId: row.parentId ?? '',
    industry: row.industry,
    description: '',
    status: row.status,
    slug: row.slug,
    sortOrder: String(row.sortOrder),
    attributeIds: [...row.attributeIds],
    iconUrl: '',
    bannerUrl: '',
    thumbnailUrl: '',
    showInApp: row.showInApp,
    showInWebsite: row.showInWebsite,
    showInMenu: row.showInMenu,
  };
}

export function getDefaultCategoryForm(): CategoryFormState {
  return {
    name: '',
    parentId: '',
    industry: 'Retail',
    description: '',
    status: 'active',
    slug: '',
    sortOrder: '99',
    attributeIds: [],
    iconUrl: '',
    bannerUrl: '',
    thumbnailUrl: '',
    showInApp: true,
    showInWebsite: true,
    showInMenu: true,
  };
}

export function getCategoryFormState(id: string | undefined): CategoryFormState {
  if (!id) return getDefaultCategoryForm();
  const row = CATEGORY_ROWS.find((r) => r.id === id);
  if (!row) return getDefaultCategoryForm();
  return rowToFormState(row);
}

/** Parent dropdown options (exclude self in edit — caller should filter). */
export function parentOptions(excludeId?: string): { id: string; label: string }[] {
  const root = { id: '', label: '— None (root) —' };
  const rest = CATEGORY_ROWS.filter((r) => r.id  !== excludeId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((r) => ({ id: r.id, label: r.parentId ? `↳ ${r.name}` : r.name }));
  return [root, ...rest];
}

/** Human hierarchy lines for list panel */
export function categoryHierarchyLines(): string[] {
  const roots = CATEGORY_ROWS.filter((r) => !r.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const lines: string[] = [];
  for (const root of roots) {
    lines.push(root.name);
    const children = CATEGORY_ROWS.filter((r) => r.parentId === root.id).sort((a, b) => a.sortOrder - b.sortOrder);
    for (const ch of children) {
      lines.push(` ├ ${ch.name}`);
    }
  }
  return lines;
}
