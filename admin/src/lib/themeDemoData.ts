import { CATEGORY_INDUSTRIES } from '@/lib/categoryDemoData';

export type ThemeStatus = 'active' | 'inactive' | 'archived';

export type ThemeCompatibility = 'mobile_app' | 'website' | 'both';

export type ThemeRow = {
  id: string;
  name: string;
  industry: string;
  version: string;
  status: ThemeStatus;
  createdAt: string;
  updatedAt: string;
  compatibility: ThemeCompatibility;
  tenantPickCount: number;
  description: string;
  previewImage: string;
  releaseNotes: string;
  /** Extra industries this theme is marketed for (industry mapping) */
  industries: string[];
  primaryColor: string;
  secondaryColor: string;
  fontStyle: string;
  headerLayout: string;
  footerLayout: string;
};

export const THEME_INDUSTRY_OPTIONS = [...CATEGORY_INDUSTRIES] as string[];

export const THEME_DASHBOARD = {
  totalThemes: 12,
  activeThemes: 10,
  industriesCovered: 7,
  mostUsedName: 'Industrial Pro',
  mostUsedPicks: 38,
};

export const THEME_ROWS: ThemeRow[] = [
  {
    id: 'thm-industrial-pro',
    name: 'Industrial Pro',
    industry: 'Industrial',
    version: '1.2',
    status: 'active',
    createdAt: '2025-05-01',
    updatedAt: '2026-03-18',
    compatibility: 'both',
    tenantPickCount: 38,
    description: 'Dense grids, B2B catalog.',
    previewImage: '/storage/demo/industrial-pro.png',
    releaseNotes: 'Improved product grid · sticky filters',
    industries: ['Industrial', 'Machinery'],
    primaryColor: '#1e3a5f',
    secondaryColor: '#f59e0b',
    fontStyle: 'Roboto',
    headerLayout: 'sticky',
    footerLayout: 'expanded',
  },
  {
    id: 'thm-factory-grid',
    name: 'Factory Grid',
    industry: 'Machinery',
    version: '1.0',
    status: 'active',
    createdAt: '2025-08-12',
    updatedAt: '2026-01-05',
    compatibility: 'both',
    tenantPickCount: 12,
    description: 'Large imagery for heavy equipment.',
    previewImage: '',
    releaseNotes: 'Initial',
    industries: ['Machinery', 'Industrial'],
    primaryColor: '#0f172a',
    secondaryColor: '#64748b',
    fontStyle: 'Inter',
    headerLayout: 'default',
    footerLayout: 'minimal',
  },
  {
    id: 'thm-modern-shoes',
    name: 'Modern Shoes',
    industry: 'Footwear',
    version: '2.1',
    status: 'active',
    createdAt: '2025-04-20',
    updatedAt: '2026-02-28',
    compatibility: 'both',
    tenantPickCount: 26,
    description: 'Retail footwear, large hero.',
    previewImage: '',
    releaseNotes: 'Cart drawer polish',
    industries: ['Footwear', 'Retail'],
    primaryColor: '#111827',
    secondaryColor: '#ec4899',
    fontStyle: 'Poppins',
    headerLayout: 'transparent',
    footerLayout: 'compact',
  },
  {
    id: 'thm-minimal-store',
    name: 'Minimal Store',
    industry: 'Retail',
    version: '1.0',
    status: 'active',
    createdAt: '2025-09-01',
    updatedAt: '2025-12-10',
    compatibility: 'website',
    tenantPickCount: 19,
    description: 'Website-first minimal storefront.',
    previewImage: '',
    releaseNotes: '—',
    industries: ['Retail', 'Textile'],
    primaryColor: '#ffffff',
    secondaryColor: '#18181b',
    fontStyle: 'System UI',
    headerLayout: 'minimal',
    footerLayout: 'minimal',
  },
  {
    id: 'thm-tech-bright',
    name: 'Tech Bright',
    industry: 'Electronics',
    version: '1.3',
    status: 'active',
    createdAt: '2025-06-15',
    updatedAt: '2026-04-01',
    compatibility: 'both',
    tenantPickCount: 22,
    description: 'Specs-forward PDP.',
    previewImage: '',
    releaseNotes: 'Spec tables · compare bar',
    industries: ['Electronics'],
    primaryColor: '#2563eb',
    secondaryColor: '#e0e7ff',
    fontStyle: 'Inter',
    headerLayout: 'sticky',
    footerLayout: 'default',
  },
  {
    id: 'thm-diamond-lux',
    name: 'Diamond Lux',
    industry: 'Diamond',
    version: '0.9',
    status: 'inactive',
    createdAt: '2025-11-20',
    updatedAt: '2026-02-01',
    compatibility: 'both',
    tenantPickCount: 2,
    description: 'High-touch luxury layout.',
    previewImage: '',
    releaseNotes: 'Beta',
    industries: ['Diamond'],
    primaryColor: '#1c1917',
    secondaryColor: '#d4af37',
    fontStyle: 'Playfair Display',
    headerLayout: 'default',
    footerLayout: 'minimal',
  },
  {
    id: 'thm-retail-pro',
    name: 'Retail Pro',
    industry: 'Retail',
    version: '3.0',
    status: 'archived',
    createdAt: '2024-01-10',
    updatedAt: '2025-03-01',
    compatibility: 'mobile_app',
    tenantPickCount: 0,
    description: 'Legacy app shell.',
    previewImage: '',
    releaseNotes: 'Superseded by Minimal Store',
    industries: ['Retail'],
    primaryColor: '#6366f1',
    secondaryColor: '#f8fafc',
    fontStyle: 'Roboto',
    headerLayout: 'default',
    footerLayout: 'expanded',
  },
];

export type ThemeFormState = {
  name: string;
  version: string;
  industry: string;
  industries: string[];
  description: string;
  status: ThemeStatus;
  compatibility: ThemeCompatibility;
  previewImage: string;
  packageNote: string;
  releaseNotes: string;
  primaryColor: string;
  secondaryColor: string;
  fontStyle: string;
  headerLayout: string;
  footerLayout: string;
};

export function rowToForm(row: ThemeRow): ThemeFormState {
  return {
    name: row.name,
    version: row.version,
    industry: row.industry,
    industries: [...row.industries],
    description: row.description,
    status: row.status,
    compatibility: row.compatibility,
    previewImage: row.previewImage,
    packageNote: 'theme.zip (layout, CSS/Tailwind, components, config)',
    releaseNotes: row.releaseNotes,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    fontStyle: row.fontStyle,
    headerLayout: row.headerLayout,
    footerLayout: row.footerLayout,
  };
}

export function getDefaultThemeForm(): ThemeFormState {
  return {
    name: '',
    version: '1.0',
    industry: 'Retail',
    industries: [],
    description: '',
    status: 'active',
    compatibility: 'both',
    previewImage: '',
    packageNote: '',
    releaseNotes: '',
    primaryColor: '#0f172a',
    secondaryColor: '#64748b',
    fontStyle: 'Inter',
    headerLayout: 'sticky',
    footerLayout: 'default',
  };
}

export function getThemeFormState(id: string | undefined): ThemeFormState {
  if (!id) return getDefaultThemeForm();
  const row = THEME_ROWS.find((r) => r.id === id);
  if (!row) return getDefaultThemeForm();
  return rowToForm(row);
}
