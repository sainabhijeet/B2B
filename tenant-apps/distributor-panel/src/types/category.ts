export type CategoryRow = {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  parentId: string | null;
  industryId: string | null;
  level: number;
  status: string;
};

export type CategoriesListResponse = {
  success: boolean;
  data: CategoryRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  message: string;
};
