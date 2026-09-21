/** Types for platform industries (rows from GET /admin/industries). */

export type IndustryStatus = 'active' | 'inactive';

export type IndustryRow = {
  industryId: string;
  displayOrder: number;
  name: string;
  description: string;
  icon: string;
  status: IndustryStatus;
  createdAt: string;
};

export type IndustryMappingRow = {
  industryId: string;
  industryName: string;
  categoryNames: string[];
  attributeNames: string[];
  themeNames: string[];
};

export function statusLabel(s: IndustryStatus): string {
  return s === 'active' ? 'Active' : 'Inactive';
}
