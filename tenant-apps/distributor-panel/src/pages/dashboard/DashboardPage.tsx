import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Download,
  Globe,
  KeyRound,
  Package,
  Rocket,
  Smartphone,
} from "lucide-react";
import { fetchOrders } from "@/api/ordersApi";
import { fetchProducts } from "@/api/productsApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlaceholderCard } from "@/components/ui/PlaceholderCard";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { DISTRIBUTOR_COUNTRY_ISO_KEY } from "@/lib/countryIsoStorage";
import {
  fetchWhiteLabelStatus,
  downloadLatestMobileAppApk,
  downloadMobileAppBuildArtifact,
  requestMobileAppBuild,
  type WhiteLabelStatusResponse,
} from "@/lib/distributorPanelApi";
import { ApiError } from "@/lib/apiClient";
import { getAuthSession } from "@/lib/authStorage";
import {
  fetchMobileReleaseSettings,
  uploadAppStore,
  uploadGooglePlay,
  type ReleaseTrack,
} from "@/lib/mobileReleaseApi";

function mobileStatusLabel(status: string): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "building":
      return "Building…";
    case "failed":
      return "Build failed";
    case "pending_build":
    case "configured":
    case "draft":
      return "Not generated";
    case "skipped":
      return "Not included";
    default:
      return status.replace(/_/g, " ");
  }
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatInr(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatBuildDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatElapsed(value: string | null): string | null {
  if (!value) return null;
  const started = new Date(value).getTime();
  if (Number.isNaN(started)) return null;
  const elapsedMs = Math.max(0, Date.now() - started);
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 1) return "less than 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function buildStatusLabel(status: string, date: string | null): string {
  if (status !== "RUNNING" && status !== "QUEUED") return status;
  const elapsed = formatElapsed(date);
  return elapsed ? `${status} (${elapsed})` : status;
}

function releaseSetupSummary(
  googleReason: string | null,
  appleReason: string | null,
): string | null {
  const reasons = [googleReason, appleReason].filter(Boolean);
  if (!reasons.length) return null;
  if (reasons.some((reason) => reason?.startsWith("Missing Credentials"))) {
    return "Release upload is waiting for store credentials.";
  }
  if (reasons.some((reason) => reason?.startsWith("Package Name Mismatch"))) {
    return "Release upload needs the store package name to match this app.";
  }
  if (reasons.some((reason) => reason?.includes("artifact is missing"))) {
    return "Release upload is waiting for the required store artifact.";
  }
  return reasons[0] ?? null;
}

function websiteOpenUrl(
  website: WhiteLabelStatusResponse["website"],
): string | null {
  const configuredPreview = (
    import.meta.env.VITE_STOREFRONT_PREVIEW_URL as string | undefined
  )?.trim();
  const raw =
    configuredPreview ||
    (import.meta.env.DEV
      ? (website.devUrl ?? website.productionUrl)
      : website.productionUrl);
  if (!raw || !import.meta.env.DEV) return raw;
  try {
    const url = new URL(raw);
    const tenantSlugFromHost = url.hostname.endsWith(".localhost")
      ? url.hostname.slice(0, -".localhost".length)
      : "";
    const tenantSlug =
      url.searchParams.get("tenant")?.trim() || tenantSlugFromHost;
    const isPanelPort =
      typeof window !== "undefined" &&
      window.location.port !== "" &&
      url.port === window.location.port;
    if (isPanelPort) {
      url.port =
        (import.meta.env.VITE_STOREFRONT_PORT as string | undefined)?.trim() ||
        "5175";
    }
    if (tenantSlugFromHost) {
      // Windows does not consistently resolve wildcard *.localhost hosts. IPv4 also
      // avoids colliding with the distributor panel when both apps use localhost.
      url.hostname = "127.0.0.1";
    }
    if (tenantSlug) {
      const tokenTenantId = getAuthSession()?.tenantId ?? null;
      if (tokenTenantId) url.searchParams.set("tenantId", tokenTenantId);
      url.searchParams.set("tenant", tenantSlug);
      url.searchParams.set("wbPreview", "0");
    }
    return url.toString().replace(/\/$/u, "");
  } catch {
    return raw;
  }
}

function websiteDisplayUrl(
  website: WhiteLabelStatusResponse["website"],
  openUrl: string | null,
): string | null {
  const raw = import.meta.env.DEV
    ? (website.devUrl ?? website.productionUrl)
    : website.productionUrl;
  const display = raw || openUrl;
  if (!display) return null;
  try {
    return new URL(display).toString().replace(/\/$/u, "");
  } catch {
    return display;
  }
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: typeof Package;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const ordersSummary = useQuery({
    queryKey: ["distributor", "orders", "dashboard"],
    queryFn: async () => (await fetchOrders()).data ?? [],
  });
  const productsMeta = useQuery({
    queryKey: ["distributor", "products", "meta"],
    queryFn: () => fetchProducts({ page: 1, limit: 1 }),
  });
  const releaseSettings = useQuery({
    queryKey: ["mobile-release", "settings"],
    queryFn: fetchMobileReleaseSettings,
    staleTime: 30_000,
  });

  const kpi = useMemo(() => {
    const orders = ordersSummary.data ?? [];
    const t0 = startOfToday();
    let pending = 0;
    let todayRev = 0;
    let allRev = 0;
    for (const o of orders) {
      allRev += Number.parseFloat(o.totalAmount) || 0;
      const ts = o.createdAt ? new Date(o.createdAt).getTime() : 0;
      if (ts >= t0) todayRev += Number.parseFloat(o.totalAmount) || 0;
      if (
        o.status === "PENDING" ||
        o.status === "PAYMENT_UPLOADED" ||
        o.status === "PROCESSING"
      )
        pending += 1;
    }
    return {
      totalOrders: orders.length,
      pending,
      allRev,
      todayRev,
      products: productsMeta.data?.meta?.total ?? null,
    };
  }, [ordersSummary.data, productsMeta.data?.meta?.total]);

  const [countryIso, setCountryIso] = useState<string | null>(null);
  const [wl, setWl] = useState<WhiteLabelStatusResponse | null>(null);
  const [wlLoading, setWlLoading] = useState(true);
  const [wlError, setWlError] = useState<string | null>(null);
  const [buildMessage, setBuildMessage] = useState<string | null>(null);
  const [buildMessageTone, setBuildMessageTone] = useState<
    "success" | "error" | null
  >(null);
  const [buildBusy, setBuildBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [releaseBusy, setReleaseBusy] = useState<"google" | "apple" | null>(
    null,
  );
  const [releaseTrack, setReleaseTrack] = useState<ReleaseTrack>("internal");
  const [historyDownloadId, setHistoryDownloadId] = useState<string | null>(
    null,
  );
  const websiteUrl = wl ? websiteOpenUrl(wl.website) : null;
  const mobileStatus = buildBusy ? "building" : wl?.mobileApp.status;
  const mobileCanRequestBuild = !!wl?.mobileApp.canRequestBuild && !buildBusy;
  const mobileDownloadUrl = buildBusy ? null : wl?.mobileApp.downloadUrl;
  const mobileBuildHistory = wl?.mobileApp.buildHistory ?? [];
  const hasActiveBuildRows = mobileBuildHistory.some(
    (row) => row.status === "RUNNING" || row.status === "QUEUED",
  );
  const releaseActions = wl?.mobileApp.releaseActions;
  const latestApk = mobileBuildHistory.find(
    (row) => row.artifactType === "APK" && row.downloadUrl,
  );
  const websiteLabel = wl ? websiteDisplayUrl(wl.website, websiteUrl) : null;
  const hasSuccessfulArtifact = !!mobileDownloadUrl || !!latestApk?.downloadUrl;
  const releaseActionsVisible =
    hasSuccessfulArtifact ||
    (!!releaseActions?.buildSuccessful && !!releaseActions.canUploadReleases);
  const latestAab = mobileBuildHistory.find(
    (row) => row.artifactType === "AAB" && row.downloadUrl,
  );
  const latestIpa = mobileBuildHistory.find(
    (row) => row.artifactType === "IPA" && row.downloadUrl,
  );
  const mobileBuildActive =
    buildBusy || hasActiveBuildRows || mobileStatus === "building";
  const aabDownloadUrl = mobileBuildActive
    ? null
    : (releaseActions?.aabDownloadUrl ?? latestAab?.downloadUrl ?? null);
  const ipaDownloadUrl =
    releaseActions?.ipaDownloadUrl ?? latestIpa?.downloadUrl ?? null;
  const effectiveMobileStatus =
    hasSuccessfulArtifact && mobileStatus === "building"
      ? "ready"
      : mobileStatus;
  const displayCurrentVersion =
    wl?.mobileApp.currentVersion ||
    latestApk?.version ||
    (hasSuccessfulArtifact ? "dev" : "-");
  const displayBuildNumber =
    wl?.mobileApp.buildNumber ?? latestApk?.buildNumber ?? "-";
  const displayBuildTime = wl?.mobileApp.buildTime ?? latestApk?.date ?? null;
  const displayBuildStatus =
    hasSuccessfulArtifact &&
    (!wl?.mobileApp.buildStatus || wl.mobileApp.buildStatus === "RUNNING")
      ? "SUCCESS"
      : wl?.mobileApp.buildStatus || (hasSuccessfulArtifact ? "SUCCESS" : "-");
  const releaseSettingsData = releaseSettings.data;
  const googlePlayBlockedReason =
    releaseActions?.googlePlayBlockedReason ||
    (!aabDownloadUrl
      ? "AAB artifact is missing; upload will fail until the AAB build completes."
      : null) ||
    (releaseSettings.isLoading
      ? "Checking Google Play credentials..."
      : null) ||
    (releaseSettings.error
      ? releaseSettings.error instanceof ApiError
        ? releaseSettings.error.message
        : "Could not check Google Play credentials."
      : null) ||
    (!releaseSettingsData?.google.hasServiceAccountJson
      ? "Missing Credentials: open Release Management > Release Settings and paste the Google Play service account JSON."
      : null) ||
    (!releaseSettingsData?.google.packageName
      ? "Package Name Mismatch: add the Google Play package name in Release Settings."
      : null) ||
    (wl?.mobileApp.packageName &&
    releaseSettingsData?.google.packageName &&
    releaseSettingsData.google.packageName !== wl.mobileApp.packageName
      ? `Package Name Mismatch: Release Settings uses ${releaseSettingsData.google.packageName}, app uses ${wl.mobileApp.packageName}.`
      : null);
  const appStoreBlockedReason =
    releaseActions?.appStoreBlockedReason ||
    (!ipaDownloadUrl
      ? "IPA artifact is missing; upload will fail until the IPA build completes."
      : null) ||
    (releaseSettings.isLoading ? "Checking App Store credentials..." : null) ||
    (releaseSettings.error
      ? releaseSettings.error instanceof ApiError
        ? releaseSettings.error.message
        : "Could not check App Store credentials."
      : null) ||
    (!releaseSettingsData?.apple.hasApiKey ||
    !releaseSettingsData?.apple.issuerId ||
    !releaseSettingsData?.apple.keyId
      ? "Missing Credentials: open Release Management > Release Settings and add App Store Connect credentials."
      : null);
  const canUploadGooglePlay =
    !!releaseActions?.canUploadGooglePlay &&
    !googlePlayBlockedReason &&
    releaseBusy === null;
  const canUploadAppStore =
    !!releaseActions?.canUploadAppStore &&
    !appStoreBlockedReason &&
    releaseBusy === null;
  const setupSummary = releaseSetupSummary(
    googlePlayBlockedReason,
    appStoreBlockedReason,
  );

  const loadWhiteLabel = useCallback((options?: { silent?: boolean }) => {
    if (!options?.silent) setWlLoading(true);
    setWlError(null);
    return fetchWhiteLabelStatus()
      .then((data) => setWl(data))
      .catch((e) => {
        setWl(null);
        setWlError(
          e instanceof ApiError ? e.message : "Could not load store status.",
        );
      })
      .finally(() => {
        if (!options?.silent) setWlLoading(false);
      });
  }, []);

  useEffect(() => {
    try {
      const v = localStorage.getItem(DISTRIBUTOR_COUNTRY_ISO_KEY);
      setCountryIso(v && /^[A-Za-z]{2}$/.test(v) ? v.toUpperCase() : null);
    } catch {
      setCountryIso(null);
    }
  }, []);

  useEffect(() => {
    void loadWhiteLabel();
  }, [loadWhiteLabel]);

  useEffect(() => {
    if (wl?.mobileApp.status !== "building" && !hasActiveBuildRows) return;
    const id = window.setInterval(
      () => void loadWhiteLabel({ silent: true }),
      3000,
    );
    return () => window.clearInterval(id);
  }, [hasActiveBuildRows, loadWhiteLabel, wl?.mobileApp.status]);

  const pollWhiteLabelUntilSettled = useCallback((maxAttempts = 20) => {
    let attempts = 0;
    const poll = () => {
      attempts += 1;
      void fetchWhiteLabelStatus()
        .then((latest) => {
          setWl(latest);
          if (
            latest.mobileApp.status === "building" &&
            attempts < maxAttempts
          ) {
            window.setTimeout(poll, 3000);
          }
        })
        .catch(() => {
          if (attempts < maxAttempts) window.setTimeout(poll, 3000);
        });
    };
    window.setTimeout(poll, 1200);
  }, []);

  const handleMobileBuildRequest = useCallback(() => {
    setBuildMessage(
      "APK and AAB build started. Please keep this page open; status updates automatically.",
    );
    setBuildMessageTone(null);
    setBuildBusy(true);
    setWl((prev) =>
      prev
        ? {
            ...prev,
            mobileApp: {
              ...prev.mobileApp,
              status: "building",
              canRequestBuild: false,
              downloadUrl: null,
            },
          }
        : prev,
    );
    pollWhiteLabelUntilSettled();
    void requestMobileAppBuild()
      .then(async (res) => {
        setBuildMessageTone(
          res.mobileApp.status === "failed" ? "error" : "success",
        );
        setBuildMessage(
          res.buildId
            ? `${res.message} Build ID: ${res.buildId.slice(0, 8)}`
            : res.message,
        );
        setWl((prev) => (prev ? { ...prev, mobileApp: res.mobileApp } : prev));
        try {
          const latest = await fetchWhiteLabelStatus();
          setWl(latest);
        } catch {
          // Keep the successful build response visible if the follow-up refresh fails.
        }
      })
      .catch((e) => {
        setBuildMessageTone("error");
        setBuildMessage(
          e instanceof ApiError ? e.message : "Could not start build request.",
        );
        void loadWhiteLabel({ silent: true });
      })
      .finally(() => {
        setBuildBusy(false);
        pollWhiteLabelUntilSettled(8);
      });
  }, [loadWhiteLabel, pollWhiteLabelUntilSettled]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Commerce overview, white-label store status, and shortcuts."
      />

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Commerce
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Live from{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">GET /orders</code>{" "}
          and{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">
            GET /products
          </code>
          . Open{" "}
          <Link
            to="/orders"
            className="font-medium text-emerald-700 hover:underline"
          >
            Orders
          </Link>
          ,{" "}
          <Link
            to="/customers"
            className="font-medium text-emerald-700 hover:underline"
          >
            Customers
          </Link>
          , or{" "}
          <Link
            to="/invoices"
            className="font-medium text-emerald-700 hover:underline"
          >
            Invoices
          </Link>
          .
        </p>
        {ordersSummary.error ? (
          <p className="mt-2 text-sm text-red-600">
            {ordersSummary.error instanceof ApiError
              ? ordersSummary.error.message
              : "Orders KPI failed to load."}
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total orders"
            value={ordersSummary.isLoading ? "…" : String(kpi.totalOrders)}
            hint="All orders returned for tenant"
            icon={BarChart3}
          />
          <StatCard
            title="Revenue (loaded)"
            value={ordersSummary.isLoading ? "…" : formatInr(kpi.allRev)}
            hint={`Today: ${formatInr(kpi.todayRev)}`}
            icon={BarChart3}
          />
          <StatCard
            title="Pending pipeline"
            value={ordersSummary.isLoading ? "…" : String(kpi.pending)}
            hint="Pending / payment uploaded / processing"
            icon={Package}
          />
          <StatCard
            title="Products"
            value={
              productsMeta.isLoading
                ? "…"
                : kpi.products != null
                  ? String(kpi.products)
                  : "—"
            }
            hint="Total from catalog meta"
            icon={Package}
          />
        </div>
      </section>

      {countryIso ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <CountryFlag
            isoCode={countryIso}
            className="text-xl leading-none"
            title={countryIso}
          />
          <span>
            Region set at signup:{" "}
            <span className="font-mono font-medium">{countryIso}</span>
          </span>
        </div>
      ) : null}

      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          White label
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          The storefront website uses your theme and domain at runtime. The
          mobile app is built only when you request it — not during onboarding.
        </p>
        {wlError ? (
          <p className="mt-3 text-sm text-red-700">{wlError}</p>
        ) : wlLoading ? (
          <p className="mt-3 text-sm text-slate-600">Loading store status…</p>
        ) : wl ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                  <Globe className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900">Website</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Status:{" "}
                    <span className="font-medium text-slate-800">
                      {wl.website.status === "ready" ? "Ready" : "Pending"}
                    </span>
                  </p>
                  {websiteUrl ? (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block break-all text-sm font-mono text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900"
                    >
                      {websiteLabel ?? websiteUrl}
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Complete onboarding and assign a domain to see the URL.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                  <Smartphone className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900">Mobile app</h3>
                  {!wl.mobileApp.enabled ? (
                    <p className="mt-1 text-sm text-slate-600">
                      Status:{" "}
                      <span className="font-medium text-slate-800">
                        Not included
                      </span>
                      <span className="mt-2 block text-xs text-slate-500">
                        You chose website only during setup. You can add an app
                        later from settings when supported.
                      </span>
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-slate-600">
                        Status:{" "}
                        <span className="font-medium text-slate-800">
                          {mobileStatusLabel(
                            effectiveMobileStatus ?? wl.mobileApp.status,
                          )}
                        </span>
                      </p>
                      <dl className="mt-3 space-y-1 text-sm">
                        <div>
                          <dt className="text-xs font-medium uppercase text-slate-500">
                            App name
                          </dt>
                          <dd className="font-medium text-slate-900">
                            {wl.mobileApp.appName || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase text-slate-500">
                            Package name
                          </dt>
                          <dd className="break-all font-mono text-slate-800">
                            {wl.mobileApp.packageName || "—"}
                          </dd>
                        </div>
                        <div className="grid gap-2 pt-2 sm:grid-cols-2">
                          <div>
                            <dt className="text-xs font-medium uppercase text-slate-500">
                              Current version
                            </dt>
                            <dd className="font-medium text-slate-900">
                              {displayCurrentVersion}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase text-slate-500">
                              Build number
                            </dt>
                            <dd className="font-medium tabular-nums text-slate-900">
                              {displayBuildNumber}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase text-slate-500">
                              Build time
                            </dt>
                            <dd className="text-slate-800">
                              {formatBuildDate(displayBuildTime)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase text-slate-500">
                              Build status
                            </dt>
                            <dd className="font-medium text-slate-900">
                              {displayBuildStatus}
                            </dd>
                          </div>
                        </div>
                      </dl>
                      {buildMessage ? (
                        <p
                          className={[
                            "mt-3 rounded-md border px-3 py-2 text-xs",
                            buildMessageTone === "error"
                              ? "border-red-200 bg-red-50 text-red-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800",
                          ].join(" ")}
                        >
                          {buildMessage}
                        </p>
                      ) : null}
                      {mobileDownloadUrl ? (
                        <div className="mt-4 space-y-3">
                          {setupSummary ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
                              <div className="flex items-start gap-2">
                                <KeyRound
                                  className="mt-0.5 h-4 w-4 shrink-0"
                                  aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold">
                                    {setupSummary}
                                  </p>
                                  <p className="mt-1 text-amber-800">
                                    Google Play needs package{" "}
                                    <span className="font-mono">
                                      {wl.mobileApp.packageName}
                                    </span>{" "}
                                    and a service account JSON. App Store
                                    uploads need IPA output and App Store
                                    Connect keys.
                                  </p>
                                </div>
                                <Link
                                  to="/release-management/settings"
                                  className="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 font-semibold text-amber-900 hover:bg-amber-100"
                                >
                                  Configure
                                </Link>
                              </div>
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={downloadBusy}
                              onClick={() => {
                                setDownloadBusy(true);
                                setBuildMessage(null);
                                setBuildMessageTone(null);
                                void downloadLatestMobileAppApk()
                                  .catch((e) => {
                                    setBuildMessageTone("error");
                                    setBuildMessage(
                                      e instanceof Error
                                        ? e.message
                                        : "Could not download APK.",
                                    );
                                  })
                                  .finally(() => setDownloadBusy(false));
                              }}
                              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              <Download className="h-4 w-4" aria-hidden />
                              {downloadBusy
                                ? "Preparing..."
                                : effectiveMobileStatus === "ready"
                                  ? "Download APK"
                                  : "Download latest APK"}
                            </button>
                            {mobileCanRequestBuild ? (
                              <button
                                type="button"
                                disabled={buildBusy}
                                onClick={handleMobileBuildRequest}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {buildBusy ? "Working..." : "Rebuild app"}
                              </button>
                            ) : null}
                            {releaseActionsVisible ? (
                              <>
                                <button
                                  type="button"
                                  disabled={
                                    aabDownloadUrl
                                      ? historyDownloadId ===
                                        (latestAab?.id ?? aabDownloadUrl)
                                      : !mobileCanRequestBuild
                                  }
                                  title={
                                    !aabDownloadUrl
                                      ? mobileBuildActive
                                        ? "The AAB is being generated with the current Android rebuild."
                                        : "No AAB exists for the older APK-only build. Generate a new APK and AAB release."
                                      : undefined
                                  }
                                  onClick={() => {
                                    if (!aabDownloadUrl) {
                                      if (mobileCanRequestBuild) {
                                        handleMobileBuildRequest();
                                      }
                                      return;
                                    }
                                    setHistoryDownloadId(
                                      latestAab?.id ?? aabDownloadUrl,
                                    );
                                    setBuildMessage(null);
                                    setBuildMessageTone(null);
                                    void downloadMobileAppBuildArtifact(
                                      aabDownloadUrl,
                                    )
                                      .catch((e) => {
                                        setBuildMessageTone("error");
                                        setBuildMessage(
                                          e instanceof Error
                                            ? e.message
                                            : "Could not download AAB.",
                                        );
                                      })
                                      .finally(() =>
                                        setHistoryDownloadId(null),
                                      );
                                  }}
                                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                                >
                                  <Download className="h-4 w-4" aria-hidden />
                                  {aabDownloadUrl &&
                                  historyDownloadId ===
                                    (latestAab?.id ?? aabDownloadUrl)
                                    ? "Preparing..."
                                    : aabDownloadUrl
                                      ? "Download AAB"
                                      : mobileBuildActive
                                        ? "Building AAB..."
                                        : "Generate AAB"}
                                </button>
                                {ipaDownloadUrl ? (
                                  <button
                                    type="button"
                                    disabled={
                                      historyDownloadId ===
                                      (latestIpa?.id ?? ipaDownloadUrl)
                                    }
                                    onClick={() => {
                                      setHistoryDownloadId(
                                        latestIpa?.id ?? ipaDownloadUrl,
                                      );
                                      setBuildMessage(null);
                                      setBuildMessageTone(null);
                                      void downloadMobileAppBuildArtifact(
                                        ipaDownloadUrl,
                                      )
                                        .catch((e) => {
                                          setBuildMessageTone("error");
                                          setBuildMessage(
                                            e instanceof Error
                                              ? e.message
                                              : "Could not download IPA.",
                                          );
                                        })
                                        .finally(() =>
                                          setHistoryDownloadId(null),
                                        );
                                    }}
                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                                  >
                                    <Download className="h-4 w-4" aria-hidden />
                                    {historyDownloadId ===
                                    (latestIpa?.id ?? ipaDownloadUrl)
                                      ? "Preparing..."
                                      : "Download IPA"}
                                  </button>
                                ) : null}
                                <select
                                  value={releaseTrack}
                                  onChange={(e) =>
                                    setReleaseTrack(
                                      e.target.value as ReleaseTrack,
                                    )
                                  }
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                                  aria-label="Google Play release track"
                                >
                                  <option value="internal">
                                    Internal Testing
                                  </option>
                                  <option value="alpha">Closed Testing</option>
                                  <option value="beta">Open Testing</option>
                                  <option value="production">Production</option>
                                </select>
                                <button
                                  type="button"
                                  disabled={!canUploadGooglePlay}
                                  title={googlePlayBlockedReason ?? undefined}
                                  onClick={() => {
                                    if (!canUploadGooglePlay) {
                                      setBuildMessageTone("error");
                                      setBuildMessage(
                                        googlePlayBlockedReason ??
                                          "Upload to Google Play is not available.",
                                      );
                                      return;
                                    }
                                    setReleaseBusy("google");
                                    setBuildMessage(
                                      "Uploading to Google Play...",
                                    );
                                    setBuildMessageTone(null);
                                    void uploadGooglePlay({
                                      track: releaseTrack,
                                    })
                                      .then((release) => {
                                        setBuildMessageTone("success");
                                        setBuildMessage(
                                          `Google Play ${release.status.toLowerCase()}: ${release.versionName}+${release.buildNumber}`,
                                        );
                                      })
                                      .catch((e) => {
                                        setBuildMessageTone("error");
                                        setBuildMessage(
                                          e instanceof ApiError
                                            ? e.message
                                            : "Upload to Google Play failed.",
                                        );
                                      })
                                      .finally(() => setReleaseBusy(null));
                                  }}
                                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <Rocket className="h-4 w-4" aria-hidden />
                                  {releaseBusy === "google"
                                    ? "Uploading..."
                                    : "Upload to Google Play"}
                                </button>
                                <button
                                  type="button"
                                  disabled={!canUploadAppStore}
                                  title={appStoreBlockedReason ?? undefined}
                                  onClick={() => {
                                    if (!canUploadAppStore) {
                                      setBuildMessageTone("error");
                                      setBuildMessage(
                                        appStoreBlockedReason ??
                                          "Upload to App Store Connect is not available.",
                                      );
                                      return;
                                    }
                                    setReleaseBusy("apple");
                                    setBuildMessage(
                                      "Uploading to App Store Connect...",
                                    );
                                    setBuildMessageTone(null);
                                    void uploadAppStore({})
                                      .then((release) => {
                                        setBuildMessageTone("success");
                                        setBuildMessage(
                                          `Apple ${release.status.toLowerCase()}: ${release.versionName}+${release.buildNumber}`,
                                        );
                                      })
                                      .catch((e) => {
                                        setBuildMessageTone("error");
                                        setBuildMessage(
                                          e instanceof ApiError
                                            ? e.message
                                            : "Upload to App Store Connect failed.",
                                        );
                                      })
                                      .finally(() => setReleaseBusy(null));
                                  }}
                                  className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                                >
                                  <Rocket className="h-4 w-4" aria-hidden />
                                  {releaseBusy === "apple"
                                    ? "Uploading..."
                                    : "Upload to App Store Connect"}
                                </button>
                                <Link
                                  to="/release-management/history"
                                  className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Release History
                                </Link>
                              </>
                            ) : null}
                          </div>
                        </div>
                      ) : mobileCanRequestBuild && mobileStatus !== "ready" ? (
                        <button
                          type="button"
                          disabled={buildBusy}
                          onClick={handleMobileBuildRequest}
                          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {buildBusy ? "Working..." : "Generate app"}
                        </button>
                      ) : mobileStatus === "building" ? (
                        <div className="mt-3 space-y-3">
                          <p className="text-xs text-slate-500">
                            Build is running. This page checks for the APK every
                            few seconds.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {mobileDownloadUrl ? (
                              <button
                                type="button"
                                disabled={downloadBusy}
                                onClick={() => {
                                  setDownloadBusy(true);
                                  setBuildMessage(null);
                                  setBuildMessageTone(null);
                                  void downloadLatestMobileAppApk()
                                    .catch((e) => {
                                      setBuildMessageTone("error");
                                      setBuildMessage(
                                        e instanceof Error
                                          ? e.message
                                          : "Could not download APK.",
                                      );
                                    })
                                    .finally(() => setDownloadBusy(false));
                                }}
                                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                              >
                                <Download className="h-4 w-4" aria-hidden />
                                {downloadBusy
                                  ? "Preparing..."
                                  : "Download latest APK"}
                              </button>
                            ) : null}
                            {mobileCanRequestBuild ? (
                              <button
                                type="button"
                                disabled={buildBusy}
                                onClick={handleMobileBuildRequest}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {buildBusy ? "Working..." : "Rebuild app"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <p className="text-xs text-slate-500">
                            {mobileStatus === "ready"
                              ? "APK is ready, but the artifact is not available yet."
                              : "Build request is not available for the current status."}
                          </p>
                          {mobileCanRequestBuild ? (
                            <button
                              type="button"
                              disabled={buildBusy}
                              onClick={handleMobileBuildRequest}
                              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {buildBusy
                                ? "Working..."
                                : mobileStatus === "ready"
                                  ? "Rebuild app"
                                  : "Generate app"}
                            </button>
                          ) : null}
                        </div>
                      )}
                      {mobileBuildHistory.length ? (
                        <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
                          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500">
                              <tr>
                                <th className="px-3 py-2 font-medium uppercase">
                                  Version
                                </th>
                                <th className="px-3 py-2 font-medium uppercase">
                                  Build
                                </th>
                                <th className="px-3 py-2 font-medium uppercase">
                                  Platform
                                </th>
                                <th className="px-3 py-2 font-medium uppercase">
                                  Artifact
                                </th>
                                <th className="px-3 py-2 font-medium uppercase">
                                  Date
                                </th>
                                <th className="px-3 py-2 font-medium uppercase">
                                  Status
                                </th>
                                <th className="px-3 py-2 font-medium uppercase">
                                  File
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {mobileBuildHistory.slice(0, 6).map((row) => (
                                <tr key={row.id}>
                                  <td className="px-3 py-2 font-medium text-slate-900">
                                    {row.version}
                                  </td>
                                  <td className="px-3 py-2 tabular-nums text-slate-700">
                                    {row.buildNumber}
                                  </td>
                                  <td className="px-3 py-2 text-slate-700">
                                    {row.platform}
                                  </td>
                                  <td className="px-3 py-2 text-slate-700">
                                    {row.artifactType ?? "-"}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {formatBuildDate(row.date)}
                                  </td>
                                  <td
                                    className="px-3 py-2 text-slate-700"
                                    title={
                                      row.status === "RUNNING" ||
                                      row.status === "QUEUED"
                                        ? "Android builds usually finish in a few minutes. Local fallback can wait up to about 20 minutes; stale jobs are treated as failed by the backend timeout."
                                        : undefined
                                    }
                                  >
                                    {buildStatusLabel(row.status, row.date)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {row.downloadUrl ? (
                                      <button
                                        type="button"
                                        disabled={historyDownloadId === row.id}
                                        onClick={() => {
                                          setHistoryDownloadId(row.id);
                                          setBuildMessage(null);
                                          setBuildMessageTone(null);
                                          void downloadMobileAppBuildArtifact(
                                            row.downloadUrl!,
                                          )
                                            .catch((e) => {
                                              setBuildMessageTone("error");
                                              setBuildMessage(
                                                e instanceof Error
                                                  ? e.message
                                                  : "Could not download build artifact.",
                                              );
                                            })
                                            .finally(() =>
                                              setHistoryDownloadId(null),
                                            );
                                        }}
                                        className="font-medium text-emerald-700 hover:underline disabled:opacity-50"
                                      >
                                        {historyDownloadId === row.id
                                          ? "Preparing..."
                                          : "Download"}
                                      </button>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/catalog/products"
          className="block rounded-sm transition hover:opacity-90"
        >
          <PlaceholderCard title="Catalog">
            <p className="text-slate-800">
              Manage products, categories, and attributes.
            </p>
          </PlaceholderCard>
        </Link>
        <Link
          to="/billing/subscription"
          className="block rounded-sm transition hover:opacity-90"
        >
          <PlaceholderCard title="Billing">
            <p className="text-slate-800">
              View subscription and available plans.
            </p>
          </PlaceholderCard>
        </Link>
        <Link
          to="/referrals/code"
          className="block rounded-sm transition hover:opacity-90"
        >
          <PlaceholderCard title="Referrals">
            <p className="text-slate-800">
              Referral code, stats, and conversions.
            </p>
          </PlaceholderCard>
        </Link>
      </div>
    </div>
  );
}
