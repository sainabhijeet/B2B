import { apiGet, apiPut } from '@/lib/apiClient';

type ModuleStateResponse<T> = { data?: { payload?: T; version?: number } };

export async function loadAdminModuleState<T>(
  moduleKey: string,
  fallback: T,
): Promise<T> {
  const response = await apiGet<ModuleStateResponse<T>>(
    `/admin/module-state/${encodeURIComponent(moduleKey)}`,
  );
  return response.data?.payload ?? fallback;
}

export async function saveAdminModuleState<T>(
  moduleKey: string,
  value: T,
): Promise<void> {
  await apiPut(`/admin/module-state/${encodeURIComponent(moduleKey)}`, { payload: value });
}
