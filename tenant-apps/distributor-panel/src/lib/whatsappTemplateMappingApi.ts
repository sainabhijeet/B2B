import { apiGet, apiPut } from "@/lib/apiClient";

export type MetaTemplateOption = {
  id: string;
  templateName: string;
  language: string;
  category: string | null;
  status: string;
  lastSyncedAt: string | null;
};

export type TemplateMappingRow = {
  template_key: string;
  meta_template_name: string | null;
  is_active: boolean;
};

export async function fetchMetaTemplateOptions(): Promise<MetaTemplateOption[]> {
  const r = await apiGet<{ success: boolean; data: MetaTemplateOption[] }>("/distributor/whatsapp/meta-templates");
  return r.data;
}

export async function fetchTemplateMappings(): Promise<TemplateMappingRow[]> {
  const r = await apiGet<{ success: boolean; data: { items: TemplateMappingRow[] } }>(
    "/distributor/whatsapp/template-mapping",
  );
  return r.data.items;
}

export async function putTemplateMappings(
  items: Array<{ template_key: string; meta_template_name?: string; is_active: boolean }>,
): Promise<TemplateMappingRow[]> {
  const r = await apiPut<{ success: boolean; data: { items: TemplateMappingRow[] } }>(
    "/distributor/whatsapp/template-mapping",
    { items },
  );
  return r.data.items;
}
