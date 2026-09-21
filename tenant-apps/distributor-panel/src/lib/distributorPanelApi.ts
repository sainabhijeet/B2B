import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/apiClient";
import { apiUrl } from "@/lib/apiBase";
import { getAccessToken } from "@/lib/authStorage";

export type WhiteLabelWebsiteStatus = {
  status: "ready" | "pending";
  productionUrl: string | null;
  devUrl: string | null;
};

export type WhiteLabelMobileAppStatus = {
  enabled: boolean;
  status: string;
  appName: string;
  packageName: string;
  canRequestBuild: boolean;
  latestBuildId: string | null;
  downloadUrl: string | null;
  currentVersion?: string | null;
  buildNumber?: number | null;
  buildTime?: string | null;
  buildStatus?: string | null;
  buildHistory?: MobileBuildHistoryRow[];
  releaseActions?: MobileReleaseActions;
};

export type MobileReleaseActions = {
  buildSuccessful: boolean;
  canUploadReleases: boolean;
  canViewReleaseHistory: boolean;
  apkDownloadUrl: string | null;
  aabDownloadUrl: string | null;
  ipaDownloadUrl: string | null;
  canUploadGooglePlay: boolean;
  canUploadAppStore: boolean;
  googlePlayBlockedReason: string | null;
  appStoreBlockedReason: string | null;
};

export type MobileBuildHistoryRow = {
  id: string;
  version: string;
  buildNumber: number;
  platform: "ANDROID" | "IOS";
  artifactType: "APK" | "AAB" | "IPA" | "WEB_BUNDLE" | null;
  date: string;
  status: string;
  downloadUrl: string | null;
};

export type WhiteLabelStatusResponse = {
  website: WhiteLabelWebsiteStatus;
  mobileApp: WhiteLabelMobileAppStatus;
};

export async function fetchWhiteLabelStatus(): Promise<WhiteLabelStatusResponse> {
  return apiGet<WhiteLabelStatusResponse>("/distributor/panel/white-label-status");
}

export type MobileBuildRequestResponse = {
  started: boolean;
  buildId: string | null;
  message: string;
  mobileApp: WhiteLabelMobileAppStatus;
};

export async function requestMobileAppBuild(): Promise<MobileBuildRequestResponse> {
  return apiPost<MobileBuildRequestResponse>("/distributor/panel/mobile-app/build-request", {});
}

export async function downloadLatestMobileAppApk(): Promise<void> {
  return downloadMobileAppArtifact(`/distributor/panel/mobile-app/artifact/latest?t=${Date.now()}`, "app-release.apk");
}

export async function downloadMobileAppBuildArtifact(downloadUrl: string): Promise<void> {
  return downloadMobileAppArtifact(downloadUrl, "app-build-artifact");
}

async function downloadMobileAppArtifact(downloadUrl: string, fallbackFileName: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(apiUrl(downloadUrl), {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    let message = "Could not download APK.";
    try {
      const body = (await res.json()) as { message?: unknown; error?: unknown };
      if (typeof body.message === "string") message = body.message;
      else if (typeof body.error === "string") message = body.error;
    } catch {
      // Keep the fallback message for non-JSON error responses.
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] ?? fallbackFileName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export type WhatsappAnalyticsResponse = {
  integrationEnabled: boolean;
  messagesSent: number;
  messagesReceived: number;
  lastMessageAt: string | null;
  lastMessageDirection: "IN" | "OUT" | null;
  lastMessagePreview: string | null;
};

export async function fetchWhatsappAnalytics(): Promise<WhatsappAnalyticsResponse> {
  return apiGet<WhatsappAnalyticsResponse>("/distributor/panel/whatsapp-analytics");
}

/** Storefront + mobile behaviour (`tenant_app_settings`). */
export type MobileAppSettings = {
  allowGuestAccess: boolean;
  showPricesToGuest: boolean;
  allowGuestCart: boolean;
  enableRepeatOrder: boolean;
  enableCreditView: boolean;
  enableNotifications: boolean;
  defaultHomeLayout: "grid" | "list";
  showBanner: boolean;
  selectedLanguageCode: string;
};

type MobileAppSettingsEnvelope = { success: boolean; data: MobileAppSettings };

/** `GET /distributor/app-config` */
export async function fetchMobileAppSettings(): Promise<MobileAppSettings> {
  const r = await apiGet<MobileAppSettingsEnvelope>("/distributor/app-config");
  return r.data;
}

/** `PUT /distributor/app-config` (partial body merged server-side). */
export async function putMobileAppSettings(
  patch: Partial<MobileAppSettings>,
): Promise<MobileAppSettings> {
  const r = await apiPut<MobileAppSettingsEnvelope>("/distributor/app-config", patch);
  return r.data;
}

export type DistributorPaymentSettings = {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
};

type DistributorPaymentSettingsEnvelope = {
  success: boolean;
  data: DistributorPaymentSettings;
};

export async function fetchDistributorPaymentSettings(): Promise<DistributorPaymentSettings> {
  const r = await apiGet<DistributorPaymentSettingsEnvelope>("/distributor/panel/payment-settings");
  return r.data;
}

export async function patchDistributorPaymentSettings(
  patch: DistributorPaymentSettings,
): Promise<DistributorPaymentSettings> {
  const r = await apiPatch<DistributorPaymentSettingsEnvelope>(
    "/distributor/panel/payment-settings",
    patch,
  );
  return r.data;
}
