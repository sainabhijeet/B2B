export const ATTRIBUTE_TYPES = [
  'text',
  'number',
  'select',
  'multi_select',
  'boolean',
  'color',
] as const;

export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export type AttributeStatus = 'active' | 'inactive' | 'archived';

export type AttributeRow = {
  id: string;
  name: string;
  type: AttributeType;
  industry: string;
  status: AttributeStatus;
  createdAt: string;
  isRequired: boolean;
  sortOrder: number;
  description: string;
  /** attribute_values — relevant for select / multi_select / color labels */
  values: string[];
  /** category_attributes */
  categoryIds: string[];
  usedForVariants: boolean;
  showProductPage: boolean;
  showFilterPanel: boolean;
  showSearchFilters: boolean;
};

export function typeLabel(t: AttributeType): string {
  const m: Record<AttributeType, string> = {
    text: 'Text',
    number: 'Number',
    select: 'Select',
    multi_select: 'Multi select',
    boolean: 'Boolean',
    color: 'Color',
  };
  return m[t];
}

export const ATTRIBUTE_ROWS: AttributeRow[] = [
  {
    id: 'attr-size',
    name: 'Size',
    type: 'select',
    industry: 'Footwear',
    status: 'active',
    createdAt: '2025-06-10',
    isRequired: true,
    sortOrder: 2,
    description: 'Shoe & apparel sizes.',
    values: ['6', '7', '8', '9', '10'],
    categoryIds: ['cat-footwear', 'cat-safety-shoes', 'cat-sports-shoes', 'cat-formal-shoes'],
    usedForVariants: true,
    showProductPage: true,
    showFilterPanel: true,
    showSearchFilters: true,
  },
  {
    id: 'attr-color',
    name: 'Color',
    type: 'color',
    industry: 'Footwear',
    status: 'active',
    createdAt: '2025-06-10',
    isRequired: false,
    sortOrder: 3,
    description: 'Color picker / presets.',
    values: ['Black', 'White', 'Blue', 'Red'],
    categoryIds: ['cat-footwear', 'cat-safety-shoes', 'cat-sports-shoes', 'cat-formal-shoes'],
    usedForVariants: true,
    showProductPage: true,
    showFilterPanel: true,
    showSearchFilters: false,
  },
  {
    id: 'attr-material',
    name: 'Material',
    type: 'select',
    industry: 'Footwear',
    status: 'active',
    createdAt: '2025-06-11',
    isRequired: false,
    sortOrder: 4,
    description: 'Upper / sole material.',
    values: ['Leather', 'Synthetic', 'Mesh', 'Rubber'],
    categoryIds: ['cat-safety-shoes', 'cat-formal-shoes'],
    usedForVariants: false,
    showProductPage: true,
    showFilterPanel: true,
    showSearchFilters: false,
  },
  {
    id: 'attr-brand',
    name: 'Brand',
    type: 'text',
    industry: 'Retail',
    status: 'active',
    createdAt: '2025-06-12',
    isRequired: false,
    sortOrder: 1,
    description: 'Manufacturer / brand name.',
    values: [],
    categoryIds: ['cat-accessories', 'cat-diamond', 'cat-machinery'],
    usedForVariants: false,
    showProductPage: true,
    showFilterPanel: true,
    showSearchFilters: true,
  },
  {
    id: 'attr-ram',
    name: 'RAM',
    type: 'select',
    industry: 'Electronics',
    status: 'active',
    createdAt: '2025-06-15',
    isRequired: true,
    sortOrder: 1,
    description: 'Memory for phones & laptops.',
    values: ['4GB', '6GB', '8GB', '12GB', '16GB'],
    categoryIds: ['cat-mobile', 'cat-laptop'],
    usedForVariants: true,
    showProductPage: true,
    showFilterPanel: true,
    showSearchFilters: true,
  },
  {
    id: 'attr-storage',
    name: 'Storage',
    type: 'multi_select',
    industry: 'Electronics',
    status: 'active',
    createdAt: '2025-06-15',
    isRequired: false,
    sortOrder: 2,
    description: 'Storage tiers.',
    values: ['64GB', '128GB', '256GB', '512GB', '1TB'],
    categoryIds: ['cat-mobile', 'cat-laptop'],
    usedForVariants: true,
    showProductPage: true,
    showFilterPanel: true,
    showSearchFilters: true,
  },
  {
    id: 'attr-battery',
    name: 'Battery',
    type: 'number',
    industry: 'Electronics',
    status: 'active',
    createdAt: '2025-06-16',
    isRequired: false,
    sortOrder: 3,
    description: 'mAh',
    values: [],
    categoryIds: ['cat-mobile'],
    usedForVariants: false,
    showProductPage: true,
    showFilterPanel: false,
    showSearchFilters: false,
  },
  {
    id: 'attr-processor',
    name: 'Processor',
    type: 'text',
    industry: 'Electronics',
    status: 'active',
    createdAt: '2025-06-16',
    isRequired: false,
    sortOrder: 4,
    description: 'Chipset name.',
    values: [],
    categoryIds: ['cat-mobile', 'cat-laptop'],
    usedForVariants: true,
    showProductPage: true,
    showFilterPanel: true,
    showSearchFilters: false,
  },
  {
    id: 'attr-voltage',
    name: 'Voltage',
    type: 'number',
    industry: 'Industrial',
    status: 'active',
    createdAt: '2025-07-01',
    isRequired: true,
    sortOrder: 1,
    description: 'Operating voltage (V).',
    values: [],
    categoryIds: ['cat-industrial', 'cat-machinery'],
    usedForVariants: false,
    showProductPage: true,
    showFilterPanel: true,
    showSearchFilters: false,
  },
  {
    id: 'attr-weight',
    name: 'Weight',
    type: 'number',
    industry: 'Industrial',
    status: 'inactive',
    createdAt: '2025-07-05',
    isRequired: false,
    sortOrder: 2,
    description: 'Net weight (kg).',
    values: [],
    categoryIds: ['cat-industrial', 'cat-machinery'],
    usedForVariants: false,
    showProductPage: true,
    showFilterPanel: false,
    showSearchFilters: false,
  },
  {
    id: 'attr-archived-demo',
    name: 'Legacy SKU',
    type: 'text',
    industry: 'Retail',
    status: 'archived',
    createdAt: '2024-01-01',
    isRequired: false,
    sortOrder: 99,
    description: 'Deprecated.',
    values: [],
    categoryIds: [],
    usedForVariants: false,
    showProductPage: false,
    showFilterPanel: false,
    showSearchFilters: false,
  },
];

/** Slim list for category form attribute linking — same ids as rows. */
export const GLOBAL_ATTRIBUTE_OPTIONS = ATTRIBUTE_ROWS.map((r) => ({
  id: r.id,
  name: r.name,
}));

export type AttributeFormState = {
  name: string;
  type: AttributeType;
  industry: string;
  description: string;
  status: AttributeStatus;
  isRequired: boolean;
  sortOrder: string;
  values: string;
  /** one per line in textarea */
  categoryIds: string[];
  usedForVariants: boolean;
  showProductPage: boolean;
  showFilterPanel: boolean;
  showSearchFilters: boolean;
};

export function rowToForm(row: AttributeRow): AttributeFormState {
  return {
    name: row.name,
    type: row.type,
    industry: row.industry,
    description: row.description,
    status: row.status,
    isRequired: row.isRequired,
    sortOrder: String(row.sortOrder),
    values: row.values.join('\n'),
    categoryIds: [...row.categoryIds],
    usedForVariants: row.usedForVariants,
    showProductPage: row.showProductPage,
    showFilterPanel: row.showFilterPanel,
    showSearchFilters: row.showSearchFilters,
  };
}

export function getDefaultAttributeForm(): AttributeFormState {
  return {
    name: '',
    type: 'text',
    industry: 'Retail',
    description: '',
    status: 'active',
    isRequired: false,
    sortOrder: '10',
    values: '',
    categoryIds: [],
    usedForVariants: false,
    showProductPage: true,
    showFilterPanel: true,
    showSearchFilters: false,
  };
}

export function getAttributeFormState(id: string | undefined): AttributeFormState {
  if (!id) return getDefaultAttributeForm();
  const row = ATTRIBUTE_ROWS.find((r) => r.id === id);
  if (!row) return getDefaultAttributeForm();
  return rowToForm(row);
}
