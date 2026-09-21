import { apiGet, apiPost, apiPut } from "@/lib/apiClient";

export type ReleaseTrack = "internal" | "alpha" | "beta" | "production";

export type MobileReleaseSettings = {
  google: {
    packageName: string;
    hasServiceAccountJson: boolean;
    defaultTrack: ReleaseTrack;
    releaseNotesTemplate: string;
  };
  apple: {
    bundleIdentifier: string;
    issuerId: string;
    keyId: string;
    hasApiKey: boolean;
    teamId: string;
  };
};

export type PutMobileReleaseSettings = {
  googlePackageName?: string;
  googleServiceAccountJson?: string;
  googleDefaultTrack?: ReleaseTrack;
  googleReleaseNotesTemplate?: string;
  appleBundleIdentifier?: string;
  appleIssuerId?: string;
  appleKeyId?: string;
  appleApiKey?: string;
  appleTeamId?: string;
};

export type MobileRelease = {
  id: string;
  tenantId: string;
  platform: "GOOGLE_PLAY" | "APP_STORE";
  versionName: string;
  buildNumber: number;
  packageName: string;
  releaseTrack: string | null;
  googleReleaseId: string | null;
  appleBuildId: string | null;
  buildDate: string | null;
  uploadDate: string | null;
  uploadedByUserId: string | null;
  status: string;
  progress: number;
  processingStatus: string | null;
  errorMessage: string | null;
  downloadUrl: string | null;
  releaseNotes: string | null;
  durationMs: number | null;
  createdAt: string;
};

export async function fetchMobileReleaseSettings(): Promise<MobileReleaseSettings> {
  return apiGet<MobileReleaseSettings>("/mobile-releases/settings");
}

export async function saveMobileReleaseSettings(
  patch: PutMobileReleaseSettings,
): Promise<MobileReleaseSettings> {
  return apiPut<MobileReleaseSettings>("/mobile-releases/settings", patch);
}

export async function fetchMobileReleases(): Promise<MobileRelease[]> {
  return apiGet<MobileRelease[]>("/mobile-releases");
}

export async function uploadGooglePlay(input: {
  track?: ReleaseTrack;
  releaseNotes?: string;
  artifactId?: string;
}): Promise<MobileRelease> {
  return apiPost<MobileRelease>("/mobile-releases/google-play/upload", input);
}

export async function uploadAppStore(input: {
  releaseNotes?: string;
  artifactId?: string;
}): Promise<MobileRelease> {
  return apiPost<MobileRelease>("/mobile-releases/app-store/upload", input);
}

export async function rollbackMobileRelease(releaseId: string): Promise<MobileRelease> {
  return apiPost<MobileRelease>(`/mobile-releases/${releaseId}/rollback`, {});
}
