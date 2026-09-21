import { apiGet, apiPost } from '@/lib/apiClient';
import { apiUrl } from '@/lib/apiBase';
import { getAccessToken } from '@/lib/authStorage';

export type TenantBuildArtifact = {
  id: string;
  artifactType: 'APK' | 'AAB' | 'IPA' | 'WEB_BUNDLE';
  fileSize: string;
  versionCode: number | null;
  versionName: string | null;
  createdAt: string;
};

export type TenantBuildJob = {
  id: string;
  tenantId: string;
  buildType: 'ANDROID_APK' | 'ANDROID_AAB' | 'IOS_IPA' | 'WEB';
  packageName: string;
  appName: string;
  status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'FAILED' | 'SUCCESS';
  progress: number;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  artifacts: TenantBuildArtifact[];
};

export function fetchTenantBuilds(tenantId: string): Promise<TenantBuildJob[]> {
  return apiGet<{ data: TenantBuildJob[] }>(
    `/builds?tenantId=${encodeURIComponent(tenantId)}`,
  ).then((body) => body.data);
}

export function retryTenantBuild(buildId: string): Promise<TenantBuildJob> {
  return apiPost<{ data: TenantBuildJob }>(
    `/builds/${encodeURIComponent(buildId)}/retry`,
    {},
  ).then((body) => body.data);
}

export async function downloadBuildArtifact(
  artifact: TenantBuildArtifact,
): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(
    apiUrl(
      `/builds/artifacts/${encodeURIComponent(artifact.id)}/download`,
    ),
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!response.ok) throw new Error(`Download failed (${response.status}).`);
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/iu)?.[1];
  const basic = disposition.match(/filename="([^"]+)"/iu)?.[1];
  const fileName = encoded
    ? decodeURIComponent(encoded)
    : basic || `build.${artifact.artifactType.toLowerCase()}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
