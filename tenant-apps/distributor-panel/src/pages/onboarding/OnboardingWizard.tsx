import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Languages, LogOut, Smartphone, Sparkles, Store } from "lucide-react";
import { clearAuth, getAuthSession, getDeviceId, getRefreshToken } from "@/lib/authStorage";
import { ApiError, apiGet, apiPost } from "@/lib/apiClient";
import {
  completeDistributorOnboarding,
  fetchDistributorOnboardingStatus,
  fetchStoreUrlPreview,
  fetchSubdomainAvailability,
  saveDistributorOnboardingStep,
  type StoreUrlPreview,
  type SubdomainAvailability,
} from "@/lib/distributorOnboardingApi";
import {
  getDistributorLoginCountryId,
  getDistributorLoginCountryIso,
  getDistributorLoginCountryName,
  getDistributorLoginPhone,
} from "@/lib/countryIsoStorage";
import { fetchCitiesPublic, fetchStatesPublic, type PublicCityRow, type PublicStateRow } from "@/lib/geoPublic";
import {
  extractBrandingColors,
  fetchBrandingAiLimits,
  suggestPalettes,
  suggestTaglines,
  type BrandPalette,
} from "@/lib/brandingAiApi";
import { generateLogos } from "@/lib/logoApi";
import {
  defaultAppNameFromBrand,
  defaultPackageNameFromBrand,
  fullPackageFromSuffix,
  isValidCubePackageName,
  PACKAGE_PREFIX,
  suffixFromFullPackage,
} from "@/lib/androidAppPackage";
import { fetchCheckPackage, type CheckPackageResponse } from "@/lib/appPackageApi";
import { fetchPublicIndustries, type PublicIndustry } from "@/lib/industriesPublic";
import { fetchPlatformLanguages, type PlatformLanguage } from "@/lib/platformLanguages";
import { fetchTenantThemes, fetchThemeComboPacks, type PublicTheme, type PublicThemeCombo } from "@/lib/themesApi";
import { isValidUpiId, normalizeUpiId, upiValidationMessage } from "@/lib/upiQr";
import { emptyOnboardingDraft, type OnboardingDraft, type PlatformChoice } from "@/types/onboarding";
import { countryFlagEmoji, parseCountriesListResponse, type PublicCountryRow } from "@shared/country-phone-display";

const PALETTE_SUGGESTION_COUNT = 9;
const PALETTE_SUGGESTION_STYLE = "varied professional";

function normalizeIndustryKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function themeMatchesIndustry(theme: PublicTheme, industry: string): boolean {
  const industryKey = normalizeIndustryKey(industry);
  if (!industryKey) return false;
  const candidates = [theme.themeType, ...theme.industryTags];
  return candidates.some((candidate) => normalizeIndustryKey(candidate) === industryKey);
}

function comboMatchesIndustry(combo: PublicThemeCombo, industry: string): boolean {
  const industryKey = normalizeIndustryKey(industry);
  if (!industryKey) return false;
  return combo.industryTags.some(
    (candidate) => normalizeIndustryKey(candidate) === industryKey,
  );
}

function stepSequence(platform: PlatformChoice | ""): number[] {
  if (platform === "website_and_mobile") return [1, 2, 3, 4, 5, 6, 7];
  return [1, 2, 3, 4, 5, 7];
}

function nextStep(current: number, platform: PlatformChoice | ""): number {
  const seq = stepSequence(platform);
  const i = seq.indexOf(current);
  return seq[Math.min(i + 1, seq.length - 1)] ?? current;
}

function prevStep(current: number, platform: PlatformChoice | ""): number {
  const seq = stepSequence(platform);
  const i = seq.indexOf(current);
  return seq[Math.max(i - 1, 0)] ?? current;
}

function clampStep(current: number, platform: PlatformChoice | ""): number {
  const seq = stepSequence(platform);
  if (seq.includes(current)) return current;
  const lower = seq.filter((x) => x <= current);
  if (lower.length) return lower[lower.length - 1]!;
  return seq[0] ?? 1;
}

function mergePayloadIntoDraft(payload: Record<string, unknown>): OnboardingDraft {
  const base = emptyOnboardingDraft();
  if (!payload || typeof payload !== "object") return base;
  const p = payload as Record<string, unknown>;
  const platformRaw = p.platform;
  const platform: PlatformChoice =
    platformRaw === "website" || platformRaw === "website_and_mobile" ? platformRaw : "website";
  const domainMode = p.domainMode === "custom" ? "custom" : "subdomain";
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);
  const languageFromList =
    Array.isArray(p.languages) && typeof p.languages[0] === "string" ? (p.languages[0] as string) : undefined;
  return {
    ...base,
    businessName: str("businessName") ?? base.businessName,
    ownerName: str("ownerName") ?? base.ownerName,
    industry: str("industry") ?? base.industry,
    countryId: str("countryId") ?? base.countryId,
    stateId: str("stateId") ?? base.stateId,
    cityId: str("cityId") ?? base.cityId,
    country: str("country") ?? base.country,
    state: str("state") ?? base.state,
    city: str("city") ?? base.city,
    gst: str("gst") ?? base.gst,
    gstVerified: p["gstVerified"] === true,
    gstLegalName: str("gstLegalName") ?? base.gstLegalName,
    gstApiState: str("gstApiState") ?? base.gstApiState,
    gstApiStatus: str("gstApiStatus") ?? base.gstApiStatus,
    address: str("address") ?? base.address,
    accountHolderName: str("accountHolderName") ?? base.accountHolderName,
    bankName: str("bankName") ?? base.bankName,
    accountNumber: str("accountNumber") ?? base.accountNumber,
    ifsc: str("ifsc") ?? base.ifsc,
    branch: str("branch") ?? base.branch,
    upiId: str("upiId") ?? base.upiId,
    phone: str("phone") ?? base.phone,
    platform,
    domainMode,
    storeDisplayName: str("storeDisplayName") ?? base.storeDisplayName,
    brandStyle: str("brandStyle") ?? base.brandStyle,
    logoDataUrl: str("logoDataUrl") ?? base.logoDataUrl,
    primaryColor: str("primaryColor") ?? base.primaryColor,
    secondaryColor: str("secondaryColor") ?? base.secondaryColor,
    tagline: str("tagline") ?? base.tagline,
    selectedLanguageCode: str("selectedLanguageCode") ?? languageFromList ?? base.selectedLanguageCode,
    subdomain: str("subdomain") ?? base.subdomain,
    customDomain: str("customDomain") ?? base.customDomain,
    themeId: str("themeId") ?? base.themeId,
    mobileThemeId: str("mobileThemeId") ?? base.mobileThemeId,
    comboId: str("comboId") ?? base.comboId,
    appName: str("appName") ?? base.appName,
    appPackage: str("appPackage") ?? base.appPackage,
    splashColor: str("splashColor") ?? base.splashColor,
  };
}

/** Lock profile country to the same row the distributor picked at login. */
function overlayLoginCountry(d: OnboardingDraft): OnboardingDraft {
  const id = getDistributorLoginCountryId();
  const nm = getDistributorLoginCountryName();
  if (id) {
    return {
      ...d,
      countryId: id,
      country: nm?.trim() ? nm.trim() : d.country,
    };
  }
  return d;
}

function overlayLoginPhone(d: OnboardingDraft): OnboardingDraft {
  const p = getDistributorLoginPhone();
  return p ? { ...d, phone: p } : d;
}

function draftToPayload(d: OnboardingDraft): Record<string, unknown> {
  const selectedLanguageCode = d.selectedLanguageCode || "en";
  return {
    businessName: d.businessName,
    ownerName: d.ownerName,
    phone: d.phone || getDistributorLoginPhone() || "",
    industry: d.industry,
    countryId: d.countryId,
    stateId: d.stateId,
    cityId: d.cityId,
    country: d.country,
    state: d.state,
    city: d.city,
    gst: d.gst,
    gstVerified: d.gstVerified,
    gstLegalName: d.gstLegalName,
    gstApiState: d.gstApiState,
    gstApiStatus: d.gstApiStatus,
    address: d.address,
    accountHolderName: d.accountHolderName,
    bankName: d.bankName,
    accountNumber: d.accountNumber,
    ifsc: d.ifsc,
    branch: d.branch,
    upiId: d.upiId,
    platform: d.platform,
    storeDisplayName: d.storeDisplayName,
    brandStyle: d.brandStyle,
    logoDataUrl: d.logoDataUrl,
    primaryColor: d.primaryColor,
    secondaryColor: d.secondaryColor,
    tagline: d.tagline,
    selectedLanguageCode,
    languages: [selectedLanguageCode],
    domainMode: d.domainMode,
    subdomain: d.subdomain,
    customDomain: d.customDomain,
    themeId: d.themeId,
    mobileThemeId: d.mobileThemeId,
    comboId: d.comboId,
    appName: d.appName,
    appPackage: d.appPackage,
    splashColor: d.splashColor,
  };
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const tenantId = getAuthSession()?.tenantId ?? null;

  const [draft, setDraft] = useState<OnboardingDraft>(emptyOnboardingDraft);
  const [step, setStep] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [industries, setIndustries] = useState<PublicIndustry[]>([]);
  const [industriesError, setIndustriesError] = useState<string | null>(null);
  const [themes, setThemes] = useState<PublicTheme[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [themesError, setThemesError] = useState<string | null>(null);
  const [themeCombos, setThemeCombos] = useState<PublicThemeCombo[]>([]);
  const [themeCombosLoading, setThemeCombosLoading] = useState(true);
  const [themeCombosError, setThemeCombosError] = useState<string | null>(null);
  const [themeIndustryFilter, setThemeIndustryFilter] = useState("");
  const [platformLanguages, setPlatformLanguages] = useState<PlatformLanguage[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [languagesError, setLanguagesError] = useState<string | null>(null);

  const [countries, setCountries] = useState<PublicCountryRow[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [states, setStates] = useState<PublicStateRow[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [statesError, setStatesError] = useState<string | null>(null);
  const [cities, setCities] = useState<PublicCityRow[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  const draftRef = useRef(draft);
  const stepRef = useRef(step);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const [wizardBusy, setWizardBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [domainStepOk, setDomainStepOk] = useState(false);
  const [appPackageStepOk, setAppPackageStepOk] = useState(false);

  const scheduleDebouncedSave = useCallback((nextDraft: OnboardingDraft) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void saveDistributorOnboardingStep({
        step: stepRef.current,
        data: draftToPayload(nextDraft),
      })
        .then(() => setSaveError(null))
        .catch((e) =>
          setSaveError(e instanceof Error ? e.message : "Autosave failed"),
        );
    }, 450);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchPlatformLanguages()
      .then((rows) => {
        if (cancelled) return;
        setPlatformLanguages(rows);
        setLanguagesError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setLanguagesError(e instanceof Error ? e.message : "Failed to load languages");
        setPlatformLanguages([]);
      })
      .finally(() => {
        if (!cancelled) setLanguagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchThemeComboPacks()
      .then((rows) => {
        if (cancelled) return;
        setThemeCombos(rows);
        setThemeCombosError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setThemeCombosError(e instanceof Error ? e.message : "Failed to load theme combos");
        setThemeCombos([]);
      })
      .finally(() => {
        if (!cancelled) setThemeCombosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    (next: OnboardingDraft) => {
      draftRef.current = next;
      setDraft(next);
      scheduleDebouncedSave(next);
    },
    [scheduleDebouncedSave],
  );

  useEffect(() => {
    if (!hydrated || languagesLoading || !platformLanguages.length) return;
    const d = draftRef.current;
    const valid = platformLanguages.some((lang) => lang.code === d.selectedLanguageCode);
    if (valid) return;
    const fallback = platformLanguages.find((lang) => lang.isDefault)?.code ?? "en";
    persist({ ...d, selectedLanguageCode: fallback });
  }, [hydrated, languagesLoading, platformLanguages, persist]);

  /** Step 6: default app name + co.cube.* package from store display name when both fields are empty. */
  useEffect(() => {
    if (step !== 6 || draftRef.current.platform !== "website_and_mobile") return;
    const d = draftRef.current;
    const brand = d.storeDisplayName.trim();
    if (!brand) return;
    if (d.appName.trim() || d.appPackage.trim()) return;
    persist({
      ...d,
      appName: defaultAppNameFromBrand(brand),
      appPackage: defaultPackageNameFromBrand(brand),
    });
  }, [step, draft.storeDisplayName, draft.platform, draft.appName, draft.appPackage, persist]);

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await saveDistributorOnboardingStep({
      step: stepRef.current,
      data: draftToPayload(draftRef.current),
    });
    setSaveError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchPublicIndustries();
        if (!cancelled) {
          setIndustries(list);
          setIndustriesError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setIndustriesError(e instanceof Error ? e.message : "Failed to load industries");
          setIndustries([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchTenantThemes()
      .then((rows) => {
        if (cancelled) return;
        setThemes(rows);
        setThemesError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setThemesError(e instanceof Error ? e.message : "Failed to load themes");
        setThemes([]);
      })
      .finally(() => {
        if (!cancelled) setThemesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void apiGet<unknown>("/countries", { skipAuth: true })
      .then((payload) => {
        if (!cancelled) {
          setCountries(parseCountriesListResponse(payload));
          setCountriesError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setCountriesError(e instanceof Error ? e.message : "Failed to load countries");
          setCountries([]);
        }
      })
      .finally(() => {
        if (!cancelled) setCountriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lockedCountry = useMemo((): {
    countryId: string;
    name: string;
    isoCode: string;
  } | null => {
    const id = getDistributorLoginCountryId();
    const storedName = getDistributorLoginCountryName();
    const iso = getDistributorLoginCountryIso();
    if (id) {
      const row = countries.find((c) => c.countryId === id);
      return {
        countryId: id,
        name: row?.name ?? storedName ?? "—",
        isoCode: (row?.isoCode ?? iso ?? "").toUpperCase(),
      };
    }
    if (iso && countries.length) {
      const row = countries.find((c) => (c.isoCode || "").toUpperCase() === iso.toUpperCase());
      if (row) {
        return {
          countryId: row.countryId,
          name: row.name,
          isoCode: (row.isoCode || iso).toUpperCase(),
        };
      }
    }
    if (iso && countriesLoading) {
      return {
        countryId: "",
        name: storedName ?? "Loading country…",
        isoCode: iso.toUpperCase(),
      };
    }
    return null;
  }, [countries, countriesLoading]);

  const loginCountryIssue = useMemo((): string | null => {
    if (!hydrated) return null;
    if (lockedCountry?.countryId) return null;
    if (getDistributorLoginCountryId() || getDistributorLoginCountryIso()) {
      if (countriesLoading) return null;
      return "Login country could not be resolved. Please sign out and log in again.";
    }
    return "No login country found. Please sign out and log in again.";
  }, [hydrated, lockedCountry, countriesLoading]);

  useEffect(() => {
    if (!lockedCountry?.countryId || !hydrated) return;
    const d = draftRef.current;
    if (d.countryId === lockedCountry.countryId && d.country === lockedCountry.name) return;
    const countryChanged = d.countryId !== lockedCountry.countryId;
    const next = countryChanged
      ? {
          ...d,
          countryId: lockedCountry.countryId,
          country: lockedCountry.name,
          stateId: "",
          state: "",
          cityId: "",
          city: "",
        }
      : { ...d, country: lockedCountry.name };
    persist(next);
  }, [lockedCountry, hydrated, persist]);

  useEffect(() => {
    if (!draft.countryId) {
      setStates([]);
      setCities([]);
      return;
    }
    let cancelled = false;
    setStatesLoading(true);
    setStatesError(null);
    void fetchStatesPublic(draft.countryId)
      .then((list) => {
        if (!cancelled) {
          setStates(list);
          setCities([]);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setStatesError(e instanceof Error ? e.message : "Failed to load states");
          setStates([]);
        }
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.countryId]);

  useEffect(() => {
    if (!draft.stateId) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    setCitiesError(null);
    void fetchCitiesPublic(draft.stateId)
      .then((list) => {
        if (!cancelled) setCities(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setCitiesError(e instanceof Error ? e.message : "Failed to load cities");
          setCities([]);
        }
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.stateId]);

  useEffect(() => {
    if (!tenantId || !hydrated || !countries.length) return;
    if (getDistributorLoginCountryId() || getDistributorLoginCountryIso()) return;
    setDraft((d) => {
      if (d.countryId) return d;
      const name = d.country?.trim();
      if (!name) return d;
      const match = countries.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
      if (!match) return d;
      const next = { ...d, countryId: match.countryId, country: match.name };
      persist(next);
      return next;
    });
  }, [countries, tenantId, hydrated, persist]);

  useEffect(() => {
    if (!tenantId || statesLoading) return;
    setDraft((d) => {
      if (!d.countryId) return d;
      if (states.length === 0) {
        if (!d.stateId && !d.cityId) return d;
        const next = { ...d, stateId: "", state: "", cityId: "", city: "" };
        persist(next);
        return next;
      }
      if (!d.stateId || states.some((s) => s.stateId === d.stateId)) return d;
      const next = { ...d, stateId: "", state: "", cityId: "", city: "" };
      persist(next);
      return next;
    });
  }, [tenantId, states, statesLoading, persist]);

  useEffect(() => {
    if (!tenantId || citiesLoading) return;
    setDraft((d) => {
      if (!d.stateId) return d;
      if (cities.length === 0) {
        if (!d.cityId) return d;
        const next = { ...d, cityId: "", city: "" };
        persist(next);
        return next;
      }
      if (!d.cityId || cities.some((c) => c.cityId === d.cityId)) return d;
      const next = { ...d, cityId: "", city: "" };
      persist(next);
      return next;
    });
  }, [tenantId, cities, citiesLoading, persist]);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    void (async () => {
      try {
        const s = await fetchDistributorOnboardingStatus();
        if (cancelled) return;
        if (s.status === "complete") {
          navigate("/", { replace: true });
          return;
        }
        const merged = overlayLoginPhone(
          overlayLoginCountry(mergePayloadIntoDraft(s.payload)),
        );
        setDraft(merged);
        setStep(clampStep(s.currentStep || 1, merged.platform));
        setBootstrapError(null);
      } catch (e) {
        if (!cancelled) {
          setBootstrapError(e instanceof Error ? e.message : "Failed to load onboarding");
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, navigate]);

  /** Clear legacy free-text industry when catalog is UUID-based. */
  useEffect(() => {
    if (!tenantId || !industries.length) return;
    setDraft((d) => {
      if (!d.industry || industries.some((i) => i.industryId === d.industry)) return d;
      const next = { ...d, industry: "" };
      persist(next);
      return next;
    });
  }, [industries, tenantId, persist]);

  const seq = useMemo(() => stepSequence(draft.platform), [draft.platform]);
  const stepIndex = seq.indexOf(step);
  const total = seq.length;
  const webThemes = useMemo(
    () => themes.filter((t) => (t.themeChannel ?? "WEB").toUpperCase() === "WEB"),
    [themes],
  );
  const mobileThemes = useMemo(
    () => themes.filter((t) => (t.themeChannel ?? "").toUpperCase() === "MOBILE"),
    [themes],
  );
  const selectedIndustryName = useMemo(
    () => industries.find((industry) => industry.industryId === draft.industry)?.name?.trim() || "",
    [draft.industry, industries],
  );
  const activeThemeIndustry = themeIndustryFilter || selectedIndustryName;
  const industryWebThemes = useMemo(
    () => webThemes.filter((theme) => themeMatchesIndustry(theme, activeThemeIndustry)),
    [activeThemeIndustry, webThemes],
  );
  const industryMobileThemes = useMemo(
    () => mobileThemes.filter((theme) => themeMatchesIndustry(theme, activeThemeIndustry)),
    [activeThemeIndustry, mobileThemes],
  );
  const industryThemeCombos = useMemo(
    () => themeCombos.filter((combo) => comboMatchesIndustry(combo, activeThemeIndustry)),
    [activeThemeIndustry, themeCombos],
  );

  useEffect(() => {
    if (selectedIndustryName) setThemeIndustryFilter(selectedIndustryName);
  }, [selectedIndustryName]);

  useEffect(() => {
    if (step !== 3) return;
    if (draft.brandStyle === "modern minimal") return;
    persist({ ...draft, brandStyle: "modern minimal" });
  }, [step, draft, persist]);

  useEffect(() => {
    if (!hydrated) return;
    if (!draft.primaryColor) return;
    if (draft.splashColor === draft.primaryColor) return;
    if (draft.splashColor && draft.splashColor !== "#0f766e") return;
    persist({ ...draft, splashColor: draft.primaryColor });
  }, [hydrated, draft, persist]);

  /** If platform changes, drop invalid steps (e.g. step 6 is only for Website + Mobile App). */
  useLayoutEffect(() => {
    if (!seq.includes(step)) {
      setStep(clampStep(step, draft.platform));
    }
  }, [draft.platform, step, seq]);

  useEffect(() => {
    if (!activeThemeIndustry || themesLoading) return;
    if (draft.platform === "website_and_mobile") {
      let nextThemeId = draft.themeId;
      let nextMobileThemeId = draft.mobileThemeId;
      let nextComboId = draft.comboId;
      const selectedCombo = industryThemeCombos.find((c) => c.id === draft.comboId) ?? null;
      if (selectedCombo) {
        nextThemeId = selectedCombo.webThemeId;
        nextMobileThemeId = selectedCombo.mobileThemeId;
      } else if (nextComboId) {
        nextComboId = "";
      }
      if (!industryWebThemes.some((t) => t.id === nextThemeId)) {
        nextThemeId = industryWebThemes[0]?.id ?? "";
      }
      if (!industryMobileThemes.some((t) => t.id === nextMobileThemeId)) {
        nextMobileThemeId = industryMobileThemes[0]?.id ?? "";
      }
      if (
        nextThemeId !== draft.themeId ||
        nextMobileThemeId !== draft.mobileThemeId ||
        nextComboId !== draft.comboId
      ) {
        persist({
          ...draft,
          themeId: nextThemeId,
          mobileThemeId: nextMobileThemeId,
          comboId: nextComboId,
        });
      }
      return;
    }
    const selectedStillValid = industryWebThemes.some((t) => t.id === draft.themeId);
    if (selectedStillValid && !draft.mobileThemeId && !draft.comboId) return;
    const nextThemeId = industryWebThemes[0]?.id ?? "";
    if (draft.themeId === nextThemeId && !draft.mobileThemeId && !draft.comboId) return;
    persist({
      ...draft,
      themeId: nextThemeId,
      mobileThemeId: "",
      comboId: "",
    });
  }, [
    draft,
    industryMobileThemes,
    industryThemeCombos,
    industryWebThemes,
    persist,
    activeThemeIndustry,
    themesLoading,
  ]);

  if (!tenantId) {
    return <Navigate to="/login" replace />;
  }
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading…
      </div>
    );
  }

  function step1LocationOk(): boolean {
    if (loginCountryIssue) return false;
    if (!draft.countryId) return false;
    if (statesLoading || citiesLoading) return false;
    if (states.length > 0 && !draft.stateId) return false;
    if (cities.length > 0 && !draft.cityId) return false;
    return true;
  }

  function canContinue(): boolean {
    switch (step) {
      case 1: {
        const gstOk = !draft.gst.trim() || draft.gstVerified;
        const paymentOk = !!(
          draft.accountHolderName.trim() &&
          draft.bankName.trim() &&
          draft.accountNumber.trim() &&
          draft.ifsc.trim() &&
          isValidUpiId(draft.upiId)
        );
        return !!(
          draft.businessName.trim() &&
          draft.ownerName.trim() &&
          draft.industry &&
          gstOk &&
          paymentOk &&
          step1LocationOk()
        );
      }
      case 2:
        return !!draft.platform;
      case 3:
        return !!draft.storeDisplayName.trim() && !!draft.selectedLanguageCode.trim();
      case 4:
        return !!draft.storeDisplayName.trim() && domainStepOk;
      case 5:
        if (draft.platform === "website_and_mobile") {
          const webOk = industryWebThemes.some((t) => t.id === draft.themeId);
          const mobileOk = industryMobileThemes.some((t) => t.id === draft.mobileThemeId);
          return webOk && mobileOk;
        }
        return industryWebThemes.some((t) => t.id === draft.themeId);
      case 6:
        return !!(draft.appName.trim() && draft.appPackage.trim() && appPackageStepOk);
      default:
        return true;
    }
  }

  async function goNext() {
    if (!canContinue()) return;
    setCompleteError(null);
    setWizardBusy(true);
    try {
      await flushSave();
      if (step === 7) {
        await completeDistributorOnboarding();
        navigate("/", { replace: true });
        return;
      }
      setStep(nextStep(step, draft.platform));
    } catch (e) {
      if (step === 7) {
        setCompleteError(e instanceof Error ? e.message : "Could not finish setup.");
      } else {
        setSaveError(e instanceof Error ? e.message : "Could not save progress.");
      }
    } finally {
      setWizardBusy(false);
    }
  }

  async function signOut() {
    setSaveError(null);
    setSigningOut(true);
    try {
      // Persist even the current, partially-filled step before ending the session.
      // If saving fails, keep the user signed in so their visible work is not lost.
      await flushSave();
    } catch (e) {
      setSaveError(
        e instanceof Error
          ? `Could not save your progress: ${e.message}`
          : "Could not save your progress. Please try again.",
      );
      setSigningOut(false);
      return;
    }

    try {
      await apiPost("/auth/logout", {
        deviceId: getDeviceId() ?? "web-distributor",
        refreshToken: getRefreshToken() ?? undefined,
      });
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  function goBack() {
    setStep(prevStep(step, draft.platform));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <span className="text-sm font-semibold text-slate-900">Store setup</span>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={wizardBusy || signingOut}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {signingOut ? "Saving & signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center gap-1">
          {seq.map((id, i) => (
            <div key={`${id}-${i}`} className="flex flex-1 items-center gap-1 min-w-[2.5rem]">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  i === stepIndex
                    ? "bg-emerald-600 text-white"
                    : i < stepIndex
                      ? "bg-emerald-200 text-emerald-900"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {i < stepIndex ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
              </div>
              {i < total - 1 ? (
                <div
                  className={`h-0.5 flex-1 rounded ${i < stepIndex ? "bg-emerald-300" : "bg-slate-200"}`}
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {bootstrapError ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {bootstrapError}
            </div>
          ) : null}
          {saveError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {saveError}
            </div>
          ) : null}
          {step === 1 ? (
            <Step1
              draft={draft}
              persist={persist}
              loginPhone={getDistributorLoginPhone()}
              industries={industries}
              industriesError={industriesError}
              lockedCountry={lockedCountry}
              loginCountryIssue={loginCountryIssue}
              countriesFetchError={countriesError}
              states={states}
              statesLoading={statesLoading}
              statesError={statesError}
              cities={cities}
              citiesLoading={citiesLoading}
              citiesError={citiesError}
            />
          ) : null}
          {step === 2 ? (
            <Step2 draft={draft} persist={persist} />
          ) : null}
          {step === 3 ? (
          <Step3
              draft={draft}
              persist={persist}
              industries={industries}
              industriesError={industriesError}
              platformLanguages={platformLanguages}
              languagesLoading={languagesLoading}
              languagesError={languagesError}
            />
          ) : null}
          {step === 4 ? (
            <Step4 draft={draft} persist={persist} onDomainStepValidityChange={setDomainStepOk} />
          ) : null}
          {step === 5 ? (
            <Step5
              draft={draft}
              persist={persist}
              industries={industries}
              themes={themes}
              themesLoading={themesLoading}
              themesError={themesError}
              themeCombos={themeCombos}
              themeCombosLoading={themeCombosLoading}
              themeCombosError={themeCombosError}
              industryFilter={activeThemeIndustry}
              onIndustryFilterChange={setThemeIndustryFilter}
            />
          ) : null}
          {step === 6 && draft.platform === "website_and_mobile" ? (
            <Step6 draft={draft} persist={persist} onAppPackageValidityChange={setAppPackageStepOk} />
          ) : null}
          {step === 7 ? <Step7 draft={draft} /> : null}

          {completeError ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {completeError}
            </div>
          ) : null}
          <div className="mt-8 flex justify-between gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || wizardBusy || signingOut}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={wizardBusy || signingOut || !canContinue()}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {wizardBusy ? "Saving…" : step === 7 ? "Finish & go to dashboard" : "Next"}
              {step !== 7 ? <ChevronRight className="h-4 w-4" /> : null}
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">
            Step {stepIndex + 1} of {total}
            {draft.platform === "website"
              ? " · Website Only — mobile app step skipped"
              : draft.platform === "website_and_mobile"
                ? " · Website + Mobile App — includes app setup"
                : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

type GstVerifyResult = {
  valid: boolean;
  legalName: string | null;
  tradeName: string | null;
  state: string | null;
  status: string | null;
};

function matchGeoStateFromGstLabel(
  states: PublicStateRow[],
  gstStateLabel: string,
): { stateId: string; state: string } | null {
  const t = gstStateLabel.trim().toLowerCase();
  if (!t || !states.length) return null;
  const norm = (s: string) => s.trim().toLowerCase();
  const exact = states.find((s) => norm(s.name) === t);
  if (exact) return { stateId: exact.stateId, state: exact.name };
  const partial = states.find(
    (s) => t.includes(norm(s.name)) || norm(s.name).includes(t),
  );
  if (partial) return { stateId: partial.stateId, state: partial.name };
  return null;
}

function withPrimaryBrandColor(draft: OnboardingDraft, primaryColor: string): OnboardingDraft {
  return {
    ...draft,
    primaryColor,
    splashColor: primaryColor,
  };
}

function Step1({
  draft,
  persist,
  loginPhone,
  industries,
  industriesError,
  lockedCountry,
  loginCountryIssue,
  countriesFetchError,
  states,
  statesLoading,
  statesError,
  cities,
  citiesLoading,
  citiesError,
}: {
  draft: OnboardingDraft;
  persist: (d: OnboardingDraft) => void;
  loginPhone: string | null;
  industries: PublicIndustry[];
  industriesError: string | null;
  lockedCountry: { countryId: string; name: string; isoCode: string } | null;
  loginCountryIssue: string | null;
  countriesFetchError: string | null;
  states: PublicStateRow[];
  statesLoading: boolean;
  statesError: string | null;
  cities: PublicCityRow[];
  citiesLoading: boolean;
  citiesError: string | null;
}) {
  const [gstVerifyLoading, setGstVerifyLoading] = useState(false);
  const [gstVerifyError, setGstVerifyError] = useState<string | null>(null);
  const [gstSuccessOpen, setGstSuccessOpen] = useState(false);

  function normalizeGstin(s: string): string {
    return s.replace(/\s/g, "").toUpperCase();
  }

  function onGstInputChange(raw: string) {
    const upper = raw.replace(/\s/g, "").toUpperCase();
    persist({
      ...draft,
      gst: upper.slice(0, 15),
      gstVerified: false,
      gstLegalName: "",
      gstApiState: "",
      gstApiStatus: "",
    });
    setGstVerifyError(null);
    setGstSuccessOpen(false);
  }

  async function onVerifyGst() {
    setGstVerifyError(null);
    const g = normalizeGstin(draft.gst);
    if (!GSTIN_PATTERN.test(g)) {
      setGstVerifyError("Enter a valid 15-character GSTIN.");
      return;
    }
    setGstVerifyLoading(true);
    try {
      const data = await apiPost<GstVerifyResult>("/gst/verify", { gstin: g });
      if (!data.valid) {
        setGstVerifyError("Invalid GST number. Please check and try again.");
        setGstSuccessOpen(false);
        return;
      }
      const matched = matchGeoStateFromGstLabel(states, data.state ?? "");
      const legal = (data.legalName ?? "").trim();
      const next: OnboardingDraft = {
        ...draft,
        gst: g,
        gstVerified: true,
        gstLegalName: legal,
        gstApiState: (data.state ?? "").trim(),
        gstApiStatus: (data.status ?? "").trim(),
        businessName:
          draft.businessName.trim() || (legal ? legal.slice(0, 255) : draft.businessName),
        ...(matched
          ? { stateId: matched.stateId, state: matched.state, cityId: "", city: "" }
          : {}),
      };
      persist(next);
      setGstSuccessOpen(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setGstVerifyError("GST verification is not configured yet. You can skip GST or try later.");
      } else if (e instanceof ApiError) {
        setGstVerifyError(e.message || "Verification failed.");
      } else {
        setGstVerifyError(e instanceof Error ? e.message : "Verification failed.");
      }
      setGstSuccessOpen(false);
    } finally {
      setGstVerifyLoading(false);
    }
  }

  function onSkipGst() {
    setGstVerifyError(null);
    setGstSuccessOpen(false);
    persist({
      ...draft,
      gst: "",
      gstVerified: false,
      gstLegalName: "",
      gstApiState: "",
      gstApiStatus: "",
    });
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Business information</h2>
      <p className="mt-1 text-sm text-slate-600">Tell us about your company — used for your tenant profile.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Business name *">
          <input
            className="input-base"
            value={draft.businessName}
            onChange={(e) => persist({ ...draft, businessName: e.target.value })}
          />
        </Field>
        <Field label="Owner / contact name *">
          <input
            className="input-base"
            value={draft.ownerName}
            onChange={(e) => persist({ ...draft, ownerName: e.target.value })}
          />
        </Field>
        <Field label="Mobile *" className="sm:col-span-2">
          <input
            className="input-base bg-slate-50 text-slate-700"
            readOnly
            value={loginPhone ?? "—"}
            title="From your login"
          />
          <p className="mt-1 text-xs text-slate-500">From login — same number used for OTP.</p>
        </Field>
        <Field label="Industry *" className="sm:col-span-2">
          {industriesError ? (
            <p className="mt-1 text-xs text-amber-800">{industriesError}</p>
          ) : null}
          <DownwardSelect
            value={draft.industry}
            disabled={!industries.length}
            placeholder={industries.length ? "Select industry" : "No industries"}
            searchPlaceholder="Search industry..."
            options={[...industries]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((i) => ({ value: i.industryId, label: i.name }))}
            onChange={(id) => persist({ ...draft, industry: id })}
          />
          {!industries.length && !industriesError ? (
            <p className="mt-2 text-xs text-slate-500">No active industries. Ask the platform admin to add some.</p>
          ) : null}
        </Field>
        <Field label="Country / region *" className="sm:col-span-2">
          {countriesFetchError ? (
            <p className="mt-1 text-xs text-amber-800">{countriesFetchError}</p>
          ) : null}
          {loginCountryIssue ? (
            <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {loginCountryIssue}
            </p>
          ) : lockedCountry ? (
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800">
              <span className="text-lg leading-none" aria-hidden>
                {countryFlagEmoji(lockedCountry.isoCode) || "🌍"}
              </span>
              <span className="font-medium">{lockedCountry.name}</span>
              <span className="text-xs text-slate-500">(from login)</span>
            </div>
          ) : null}
        </Field>
        <Field label="State / province">
          {statesError ? (
            <p className="mt-1 text-xs text-amber-800">{statesError}</p>
          ) : null}
          <DownwardSelect
            value={draft.stateId}
            disabled={!draft.countryId || statesLoading}
            searchPlaceholder="Search state / province..."
            placeholder={
              !draft.countryId
                ? "Select country first"
                : statesLoading
                  ? "Loading..."
                  : states.length === 0
                    ? "No states in database"
                    : "Select state"
            }
            options={states.map((s) => ({ value: s.stateId, label: s.name }))}
            onChange={(id) => {
              const row = states.find((s) => s.stateId === id);
              persist({
                ...draft,
                stateId: id,
                state: row?.name ?? "",
                cityId: "",
                city: "",
              });
            }}
          />
        </Field>
        <Field label="City">
          {citiesError ? <p className="mt-1 text-xs text-amber-800">{citiesError}</p> : null}
          <DownwardSelect
            value={draft.cityId}
            disabled={!draft.stateId || citiesLoading}
            searchPlaceholder="Search city..."
            placeholder={
              !draft.stateId
                ? "Select state first"
                : citiesLoading
                  ? "Loading..."
                  : cities.length === 0
                    ? "No cities in database"
                    : "Select city"
            }
            options={cities.map((c) => ({ value: c.cityId, label: c.name }))}
            onChange={(id) => {
              const row = cities.find((c) => c.cityId === id);
              persist({
                ...draft,
                cityId: id,
                city: row?.name ?? "",
              });
            }}
          />
        </Field>
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                draft.gstVerified
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {draft.gstVerified ? "GST Verified" : "GST Not Verified"}
            </span>
            <span className="text-xs text-slate-500">GST optional — you can add it later</span>
          </div>
        </div>
        <Field label="GST number (optional)" className="sm:col-span-2">
          <input
            className="input-base font-mono tracking-wide"
            placeholder="15-character GSTIN"
            value={draft.gst}
            onChange={(e) => onGstInputChange(e.target.value)}
            maxLength={15}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={gstVerifyLoading || !draft.gst.trim()}
              onClick={() => void onVerifyGst()}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {gstVerifyLoading ? "Verifying…" : "Verify GST"}
            </button>
            <button
              type="button"
              onClick={onSkipGst}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Skip GST
            </button>
          </div>
          {gstVerifyError ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <p className="font-medium">Could not verify GST</p>
              <p className="mt-1">{gstVerifyError}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setGstVerifyError(null)}
                  className="text-sm font-medium text-red-900 underline"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={onSkipGst}
                  className="text-sm font-medium text-red-900 underline"
                >
                  Skip GST
                </button>
              </div>
            </div>
          ) : null}
          {gstSuccessOpen && draft.gstVerified ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
              <p className="font-semibold text-emerald-900">GST Verified</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-emerald-900/90">
                <li>Legal name: {draft.gstLegalName || "—"}</li>
                <li>State: {draft.gstApiState || "—"}</li>
                <li>Status: {draft.gstApiStatus || "—"}</li>
              </ul>
              <p className="mt-2 text-xs text-emerald-800/90">
                Business name and state were auto-filled where possible — you can still edit them above.
              </p>
              <button
                type="button"
                onClick={() => setGstSuccessOpen(false)}
                className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Confirm & Continue
              </button>
            </div>
          ) : null}
        </Field>
        <Field label="Address (optional)" className="sm:col-span-2">
          <textarea
            className="input-base min-h-[4rem] resize-y"
            value={draft.address}
            onChange={(e) => persist({ ...draft, address: e.target.value })}
            placeholder="Street, building, area…"
          />
        </Field>
        <div className="sm:col-span-2 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-900">Payment bank details</h3>
          <p className="mt-1 text-xs text-slate-500">
            Used on checkout in your website and mobile app. The QR is generated from the UPI ID.
          </p>
        </div>
        <Field label="Account holder *">
          <input
            className="input-base"
            value={draft.accountHolderName}
            onChange={(e) => persist({ ...draft, accountHolderName: e.target.value })}
            placeholder={draft.businessName || "Account holder name"}
          />
        </Field>
        <Field label="Bank name *">
          <input
            className="input-base"
            value={draft.bankName}
            onChange={(e) => persist({ ...draft, bankName: e.target.value })}
            placeholder="HDFC Bank"
          />
        </Field>
        <Field label="Account number *">
          <input
            className="input-base font-mono"
            value={draft.accountNumber}
            onChange={(e) => persist({ ...draft, accountNumber: e.target.value.replace(/[^\d]/g, "") })}
            inputMode="numeric"
            autoComplete="off"
          />
        </Field>
        <Field label="IFSC *">
          <input
            className="input-base font-mono uppercase"
            value={draft.ifsc}
            onChange={(e) => persist({ ...draft, ifsc: e.target.value.replace(/\s/g, "").toUpperCase().slice(0, 11) })}
            placeholder="HDFC0001234"
            maxLength={11}
            autoComplete="off"
          />
        </Field>
        <Field label="Branch">
          <input
            className="input-base"
            value={draft.branch}
            onChange={(e) => persist({ ...draft, branch: e.target.value })}
            placeholder="Branch name"
          />
        </Field>
        <Field label="UPI ID *">
          <input
            className="input-base"
            value={draft.upiId}
            onChange={(e) => persist({ ...draft, upiId: normalizeUpiId(e.target.value) })}
            placeholder="business@upi"
            autoComplete="off"
          />
          {upiValidationMessage(draft.upiId) ? (
            <span className="mt-1 block text-xs text-red-700">{upiValidationMessage(draft.upiId)}</span>
          ) : null}
        </Field>
      </div>
      <style>{`
        .input-base { margin-top: 0.25rem; width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input-base:focus { border-color: rgb(16 185 129); box-shadow: 0 0 0 2px rgb(16 185 129 / 0.2); }
      `}</style>
    </div>
  );
}

function Step2({
  draft,
  persist,
}: {
  draft: OnboardingDraft;
  persist: (d: OnboardingDraft) => void;
}) {
  const Card = ({
    value,
    title,
    body,
    icon: Icon,
  }: {
    value: PlatformChoice;
    title: string;
    body: string;
    icon: typeof Store;
  }) => {
    const active = draft.platform === value;
    return (
      <button
        type="button"
        onClick={() =>
          persist({
            ...draft,
            platform: value,
            ...(value === "website"
              ? { appName: "", appPackage: "" }
              : {}),
          })
        }
        className={`flex w-full flex-col rounded-xl border-2 p-4 text-left transition ${
          active ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <Icon className={`h-8 w-8 ${active ? "text-emerald-700" : "text-slate-500"}`} />
        <span className="mt-3 font-semibold text-slate-900">{title}</span>
        <span className="mt-1 text-sm text-slate-600">{body}</span>
      </button>
    );
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Choose platform</h2>
      <p className="mt-1 text-sm text-slate-600">
        <span className="font-medium text-slate-800">Website Only</span> skips the mobile app setup step.
        {" "}
        <span className="font-medium text-slate-800">Website + Mobile App</span> adds one step for app name
        and package before launch.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card
          value="website"
          title="Website Only"
          body="Storefront in the browser only — no Android app setup in this wizard."
          icon={Store}
        />
        <Card
          value="website_and_mobile"
          title="Website + Mobile App"
          body="Same catalogue on web plus a branded installable app (extra setup step)."
          icon={Smartphone}
        />
      </div>
    </div>
  );
}

function normalizeHex7(raw: string): string | null {
  const t = raw.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t.toLowerCase()}`;
  return null;
}

function formatLogoApiError(e: ApiError): string {
  if (e.status === 429 && e.body && typeof e.body === "object" && "message" in e.body) {
    const m = (e.body as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return e.message;
}

function LogoAiModal({
  open,
  onClose,
  draft,
  persist,
  industries,
  colorsFromLogoUpload,
}: {
  open: boolean;
  onClose: () => void;
  draft: OnboardingDraft;
  persist: (d: OnboardingDraft) => void;
  industries: PublicIndustry[];
  /** When true, primary/secondary already come from upload extraction — logo gen can run without picking a new palette. */
  colorsFromLogoUpload: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [logos, setLogos] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [generationSource, setGenerationSource] = useState<"openai" | "local" | null>(null);
  const [limit, setLimit] = useState(2);
  const [modalPalettes, setModalPalettes] = useState<BrandPalette[]>([]);
  const [modalPaletteLoading, setModalPaletteLoading] = useState(false);
  const [paletteErrModal, setPaletteErrModal] = useState<string | null>(null);
  const [colorsConfirmed, setColorsConfirmed] = useState(false);

  const industryLabel = industries.find((i) => i.industryId === draft.industry)?.name?.trim() || "—";
  const businessName = (draft.storeDisplayName || draft.businessName || "").trim();
  const pri = normalizeHex7(draft.primaryColor);
  const sec = normalizeHex7(draft.secondaryColor);
  const hasValidPair = !!(pri && sec);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setLogos([]);
    setGenerationSource(null);
    setModalPalettes([]);
    setPaletteErrModal(null);
    void fetchBrandingAiLimits()
      .then((r) => setLimit(r.logoGenerationLimit))
      .catch(() => setLimit(2));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (colorsFromLogoUpload && hasValidPair) {
      setColorsConfirmed(true);
    } else {
      setColorsConfirmed(false);
    }
  }, [open, colorsFromLogoUpload, hasValidPair]);

  if (!open) return null;

  async function loadModalPalettes() {
    setPaletteErrModal(null);
    if (!businessName) {
      setPaletteErrModal("Add your store name on the main screen first.");
      return;
    }
    if (!draft.industry) {
      setPaletteErrModal("Select your industry in step 1 first.");
      return;
    }
    setModalPaletteLoading(true);
    try {
      const res = await suggestPalettes({
        business_name: businessName,
        industry: industryLabel,
        style: PALETTE_SUGGESTION_STYLE,
        count: PALETTE_SUGGESTION_COUNT,
      });
      setModalPalettes(res.palettes);
    } catch (e) {
      setPaletteErrModal(e instanceof ApiError ? e.message : "Could not load palettes.");
    } finally {
      setModalPaletteLoading(false);
    }
  }

  function applyModalPalette(pal: BrandPalette) {
    persist({ ...withPrimaryBrandColor(draft, pal.primary), secondaryColor: pal.secondary });
    setColorsConfirmed(true);
    setErr(null);
  }

  async function onGenerate() {
    setErr(null);
    if (!businessName) {
      setErr("Add a store name on the main screen first.");
      return;
    }
    if (!draft.industry) {
      setErr("Select your industry in step 1 (Business information) first.");
      return;
    }
    if (!colorsConfirmed || !pri || !sec) {
      setErr("Choose a color palette below (or confirm colors from your uploaded logo).");
      return;
    }
    setLoading(true);
    try {
      const res = await generateLogos({
        business_name: businessName,
        industry: industryLabel,
        primary_hex: pri,
        secondary_hex: sec,
        ...(draft.tagline.trim() ? { tagline: draft.tagline.trim() } : {}),
      });
      setLogos(res.logos);
      setRemaining(res.generations_remaining);
      setGenerationSource(res.generation_source ?? "openai");
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(formatLogoApiError(e));
      } else {
        setErr(e instanceof Error ? e.message : "Generation failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  function pickLogo(src: string) {
    persist({ ...draft, logoDataUrl: src });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Generate logo</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Pick brand colors first, then generate. Tagline from the main screen is included when set.
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <div>
            <span className="font-medium text-slate-700">Business name</span>
            <p className="mt-0.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-slate-900">
              {businessName || "—"}
            </p>
          </div>
          <div>
            <span className="font-medium text-slate-700">Industry</span>
            <p className="mt-0.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-slate-900">{industryLabel}</p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">1 · Brand colors</p>
          {colorsFromLogoUpload && hasValidPair ? (
            <p className="mt-1 text-xs text-emerald-800">
              Using colors extracted from your uploaded logo. You can still pick a different palette below.
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={modalPaletteLoading}
              onClick={() => void loadModalPalettes()}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {modalPaletteLoading
                ? "Loading…"
                : `Get ${PALETTE_SUGGESTION_COUNT} palette suggestions`}
            </button>
            {hasValidPair ? (
              <button
                type="button"
                onClick={() => {
                  setColorsConfirmed(true);
                  setErr(null);
                }}
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
              >
                Use current colors on screen
              </button>
            ) : null}
          </div>
          {paletteErrModal ? <p className="mt-2 text-xs text-red-700">{paletteErrModal}</p> : null}
          {modalPalettes.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {modalPalettes.map((pal, idx) => (
                <button
                  key={`m-${pal.primary}-${idx}`}
                  type="button"
                  onClick={() => applyModalPalette(pal)}
                  className={`rounded-lg border bg-white p-2 text-left text-xs shadow-sm ${
                    pri === pal.primary && sec === pal.secondary
                      ? "border-emerald-500 ring-2 ring-emerald-200"
                      : "border-slate-200 hover:border-emerald-400"
                  }`}
                >
                  <div className="flex h-9 gap-1 overflow-hidden rounded">
                    <span className="flex-1" style={{ background: pal.primary }} />
                    <span className="flex-1" style={{ background: pal.secondary }} />
                  </div>
                  <p className="mt-1 font-medium text-slate-800">{pal.label ?? `Palette ${idx + 1}`}</p>
                </button>
              ))}
            </div>
          ) : null}
          {hasValidPair ? (
            <p className="mt-2 font-mono text-[10px] text-slate-600">
              Current: {pri} · {sec}
              {colorsConfirmed ? <span className="ml-2 text-emerald-700">✓ Ready</span> : null}
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-800">Choose a palette above to set primary and secondary colors.</p>
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">2 · Generate logos</p>
          {remaining !== null && remaining >= 0 ? (
            <p className="mt-1 text-xs text-slate-600">
              Batches left: <span className="font-semibold">{remaining}</span>
            </p>
          ) : null}
          {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}
          {generationSource === "local" ? (
            <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              Logo variants generated locally from your business name and selected brand colors.
            </p>
          ) : null}
          <button
            type="button"
            disabled={loading || !colorsConfirmed || !pri || !sec}
            onClick={() => void onGenerate()}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? "Generating…" : `Generate ${limit} logo${limit === 1 ? "" : "s"}`}
          </button>
        </div>

        {logos.length > 0 ? (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium text-slate-800">3 · Pick a logo</p>
            <div className={`grid gap-3 ${logos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {logos.map((src, i) => (
                <button
                  key={`${i}-${src.slice(0, 48)}`}
                  type="button"
                  onClick={() => pickLogo(src)}
                  className="group rounded-lg border-2 border-slate-200 bg-white p-3 text-left transition hover:border-indigo-500 hover:shadow-md"
                >
                  <img
                    src={src}
                    alt={`Option ${i + 1}`}
                    className="mx-auto h-28 w-full max-w-[200px] object-contain"
                  />
                  <span className="mt-2 block text-center text-xs font-medium text-indigo-700 group-hover:underline">
                    Use logo {i + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Step3({
  draft,
  persist,
  industries,
  industriesError,
  platformLanguages,
  languagesLoading,
  languagesError,
}: {
  draft: OnboardingDraft;
  persist: (d: OnboardingDraft) => void;
  industries: PublicIndustry[];
  industriesError: string | null;
  platformLanguages: PlatformLanguage[];
  languagesLoading: boolean;
  languagesError: string | null;
}) {
  const [paletteLoading, setPaletteLoading] = useState(false);
  const [paletteErr, setPaletteErr] = useState<string | null>(null);
  const [palettes, setPalettes] = useState<BrandPalette[]>([]);
  const [taglineLoading, setTaglineLoading] = useState(false);
  const [taglineErr, setTaglineErr] = useState<string | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [fontHint, setFontHint] = useState<string | null>(null);
  const [kitLoading, setKitLoading] = useState(false);
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractErr, setExtractErr] = useState<string | null>(null);
  const [colorsFromLogo, setColorsFromLogo] = useState(false);

  const industryLabel = industries.find((i) => i.industryId === draft.industry)?.name?.trim() || "";
  const languageOptions = platformLanguages.map((lang) => ({
    value: lang.code,
    label: `${lang.name} (${lang.code})${lang.isDefault ? " - default" : ""}`,
  }));
  const selectedLanguage = platformLanguages.find((lang) => lang.code === draft.selectedLanguageCode);

  function onLogo(f: File | null) {
    if (!f) {
      setExtractErr(null);
      setColorsFromLogo(false);
      persist({ ...draft, logoDataUrl: "" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        if (!dataUrl) return;
        setExtractErr(null);
        setExtracting(true);
        try {
          const { primary, secondary } = await extractBrandingColors({ image_data_url: dataUrl });
          persist({ ...withPrimaryBrandColor(draft, primary), logoDataUrl: dataUrl, secondaryColor: secondary });
          setColorsFromLogo(true);
        } catch (e) {
          persist({ ...draft, logoDataUrl: dataUrl });
          setColorsFromLogo(false);
          setExtractErr(e instanceof ApiError ? e.message : "Could not extract colors from this image.");
        } finally {
          setExtracting(false);
        }
      })();
    };
    reader.readAsDataURL(f);
  }

  async function onLoadPalettes() {
    setPaletteErr(null);
    const name = (draft.storeDisplayName || draft.businessName || "").trim();
    if (!name) {
      setPaletteErr("Add your store name first.");
      return;
    }
    if (!draft.industry || !industryLabel) {
      setPaletteErr("Select your industry in step 1 (Business information), then return here.");
      return;
    }
    setPaletteLoading(true);
    try {
      const res = await suggestPalettes({
        business_name: name,
        industry: industryLabel,
        style: PALETTE_SUGGESTION_STYLE,
        count: PALETTE_SUGGESTION_COUNT,
      });
      setPalettes(res.palettes);
    } catch (e) {
      setPaletteErr(e instanceof ApiError ? e.message : "Could not load palettes.");
    } finally {
      setPaletteLoading(false);
    }
  }

  async function onSuggestTaglines() {
    setTaglineErr(null);
    const name = (draft.storeDisplayName || draft.businessName || "").trim();
    if (!name) {
      setTaglineErr("Add your store name first.");
      return;
    }
    if (!draft.industry || !industryLabel) {
      setTaglineErr("Select your industry in step 1 first.");
      return;
    }
    const pri = normalizeHex7(draft.primaryColor);
    const sec = normalizeHex7(draft.secondaryColor);
    setTaglineLoading(true);
    try {
      const res = await suggestTaglines({
        business_name: name,
        industry: industryLabel,
        ...(pri && sec ? { primary_hex: pri, secondary_hex: sec } : {}),
      });
      setTagSuggestions(res.taglines);
      setFontHint(res.font_hint);
    } catch (e) {
      setTaglineErr(e instanceof ApiError ? e.message : "Could not load taglines.");
    } finally {
      setTaglineLoading(false);
    }
  }

  async function onBrandKit() {
    setPaletteErr(null);
    setTaglineErr(null);
    const name = (draft.storeDisplayName || draft.businessName || "").trim();
    if (!name) {
      setPaletteErr("Add your store name first.");
      return;
    }
    if (!draft.industry || !industryLabel) {
      setPaletteErr("Select your industry in step 1 first.");
      return;
    }
    setKitLoading(true);
    try {
      const palRes = await suggestPalettes({
        business_name: name,
        industry: industryLabel,
        style: PALETTE_SUGGESTION_STYLE,
        count: PALETTE_SUGGESTION_COUNT,
      });
      const first = palRes.palettes[0];
      const primaryNext = first?.primary ?? draft.primaryColor;
      const secondaryNext = first?.secondary ?? draft.secondaryColor;
      const pri = normalizeHex7(primaryNext);
      const sec = normalizeHex7(secondaryNext);
      const tagRes = await suggestTaglines({
        business_name: name,
        industry: industryLabel,
        ...(pri && sec ? { primary_hex: pri, secondary_hex: sec } : {}),
      });
      const t0 = tagRes.taglines[0];
      persist({
        ...withPrimaryBrandColor(draft, primaryNext),
        secondaryColor: secondaryNext,
        tagline: t0 ?? draft.tagline,
      });
      setColorsFromLogo(false);
      setPalettes(palRes.palettes);
      setTagSuggestions(tagRes.taglines);
      setFontHint(tagRes.font_hint);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Brand kit failed.";
      setPaletteErr(msg);
    } finally {
      setKitLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Branding</h2>
      <p className="mt-1 text-sm text-slate-600">
        Logo first → colors (from your file or a palette for AI) → tagline. Industry comes from step 1.
      </p>

      {industriesError ? (
        <p className="mt-3 text-xs text-amber-800">{industriesError}</p>
      ) : null}
      {!draft.industry ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Select an industry in step 1 to unlock AI colors, taglines, and logos.
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-600">
          Industry: <span className="font-medium text-slate-800">{industryLabel || "—"}</span>
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Select language *" className="sm:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                <Languages className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DownwardSelect
                  value={draft.selectedLanguageCode || "en"}
                  options={languageOptions.length ? languageOptions : [{ value: "en", label: "English (en) - default" }]}
                  placeholder={languagesLoading ? "Loading languages..." : "Select language"}
                  disabled={languagesLoading}
                  onChange={(selectedLanguageCode) => persist({ ...draft, selectedLanguageCode })}
                />
                <p className="mt-2 text-xs text-slate-600">
                  {selectedLanguage
                    ? `${selectedLanguage.name} will be used for this store website and mobile app.`
                    : "English is selected by default for this store website and mobile app."}
                </p>
                {languagesError ? <p className="mt-1 text-xs text-amber-800">{languagesError}</p> : null}
              </div>
            </div>
          </div>
        </Field>

        <Field label="Store name *" className="sm:col-span-2">
          <input
            className="input-base"
            value={draft.storeDisplayName}
            onChange={(e) => persist({ ...draft, storeDisplayName: e.target.value })}
            placeholder="ABC Distributors"
          />
        </Field>

        <Field label="Logo" className="sm:col-span-2">
          <p className="text-xs text-slate-500">
            Upload a logo — we read primary and secondary colors automatically. Or generate a logo with AI (pick a
            palette in the popup first).
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="image/*"
              disabled={extracting}
              className="text-sm"
              onChange={(e) => onLogo(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => setLogoModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Sparkles className="h-4 w-4" />
              Generate logo
            </button>
          </div>
          {extracting ? <p className="mt-2 text-xs text-slate-600">Reading colors from your image…</p> : null}
          {extractErr ? <p className="mt-2 text-xs text-red-700">{extractErr}</p> : null}
          {colorsFromLogo ? (
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900">
              Brand colors were set from your logo. Adjust below anytime, or use AI palettes if you switch to an
              AI-generated logo.
            </p>
          ) : null}
          {draft.logoDataUrl ? (
            <img src={draft.logoDataUrl} alt="" className="mt-2 h-16 w-auto max-w-full rounded border border-slate-200" />
          ) : null}
        </Field>

        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-slate-900">Brand colors</p>
          {colorsFromLogo ? (
            <p className="mt-0.5 text-xs text-slate-600">
              Taken from your uploaded logo. Optional: tweak with pickers or load new AI palettes if you are not using
              upload colors anymore.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-500">
              Until you upload a logo, use AI palettes here — required before AI logo generation.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={paletteLoading || kitLoading}
              onClick={() => void onLoadPalettes()}
              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {paletteLoading
                ? "Generating…"
                : `Generate ${PALETTE_SUGGESTION_COUNT} colors`}
            </button>
            <button
              type="button"
              disabled={paletteLoading || kitLoading || taglineLoading}
              onClick={() => void onBrandKit()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900 hover:bg-indigo-100 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {kitLoading ? "Working…" : "AI brand kit"}
            </button>
          </div>
          {paletteErr ? <p className="mt-2 text-xs text-red-700">{paletteErr}</p> : null}
          {palettes.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {palettes.map((pal, idx) => (
                <button
                  key={`${pal.primary}-${pal.secondary}-${idx}`}
                  type="button"
                  onClick={() => {
                    setColorsFromLogo(false);
                    persist({
                      ...withPrimaryBrandColor(draft, pal.primary),
                      secondaryColor: pal.secondary,
                    });
                  }}
                  className="rounded-lg border border-slate-200 bg-white p-2 text-left text-xs shadow-sm hover:border-emerald-400"
                >
                  <div className="flex h-10 gap-1 overflow-hidden rounded">
                    <span className="flex-1" style={{ background: pal.primary }} />
                    <span className="flex-1" style={{ background: pal.secondary }} />
                  </div>
                  <p className="mt-1 font-medium text-slate-800">{pal.label ?? `Palette ${idx + 1}`}</p>
                  <p className="font-mono text-[10px] text-slate-500">
                    {pal.primary} · {pal.secondary}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <Field label="Primary (edit)" className="min-w-[140px]">
              <input
                type="color"
                className="mt-1 h-10 w-full max-w-[120px] cursor-pointer rounded border border-slate-200"
                value={draft.primaryColor}
                onChange={(e) => {
                  setColorsFromLogo(false);
                  persist(withPrimaryBrandColor(draft, e.target.value));
                }}
              />
            </Field>
            <Field label="Secondary (edit)" className="min-w-[140px]">
              <input
                type="color"
                className="mt-1 h-10 w-full max-w-[120px] cursor-pointer rounded border border-slate-200"
                value={draft.secondaryColor}
                onChange={(e) => {
                  setColorsFromLogo(false);
                  persist({ ...draft, secondaryColor: e.target.value });
                }}
              />
            </Field>
          </div>
        </div>

        <Field label="Tagline" className="sm:col-span-2">
          <input
            className="input-base"
            value={draft.tagline}
            onChange={(e) => persist({ ...draft, tagline: e.target.value })}
            placeholder="Quality parts. Faster fulfilment."
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={taglineLoading || kitLoading}
              onClick={() => void onSuggestTaglines()}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-100 disabled:opacity-50"
            >
              {taglineLoading ? "Suggesting…" : "AI suggest tagline"}
            </button>
            {taglineErr ? <span className="text-xs text-red-700">{taglineErr}</span> : null}
          </div>
          {tagSuggestions.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {tagSuggestions.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => persist({ ...draft, tagline: t })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:border-emerald-400"
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {fontHint ? (
            <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <span className="font-semibold text-slate-800">Font idea:</span> {fontHint}
            </p>
          ) : null}
        </Field>

        <LogoAiModal
          open={logoModalOpen}
          onClose={() => setLogoModalOpen(false)}
          draft={draft}
          persist={persist}
          industries={industries}
          colorsFromLogoUpload={colorsFromLogo}
        />

        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-slate-900">Brand previews</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Logo</p>
              {draft.logoDataUrl ? (
                <img src={draft.logoDataUrl} alt="" className="mx-auto mt-2 h-16 w-16 rounded-lg object-contain" />
              ) : (
                <div className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                  —
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Website header</p>
              <div
                className="mt-2 flex items-center gap-2 rounded-md border-b-4 px-2 py-2"
                style={{
                  background: draft.primaryColor,
                  borderColor: draft.secondaryColor,
                }}
              >
                {draft.logoDataUrl ? (
                  <img src={draft.logoDataUrl} alt="" className="h-8 w-8 rounded bg-white/90 object-contain p-0.5" />
                ) : (
                  <div className="h-8 w-8 rounded bg-white/20" />
                )}
                <span className="truncate text-[10px] font-semibold text-white">
                  {draft.storeDisplayName.trim() || "Store"}
                </span>
              </div>
              {draft.tagline.trim() ? (
                <p className="mt-1 line-clamp-2 text-[10px] text-slate-600">{draft.tagline}</p>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">App icon</p>
              <div
                className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner"
                style={{
                  background: `linear-gradient(145deg, ${draft.primaryColor}, ${draft.secondaryColor})`,
                }}
              >
                {draft.logoDataUrl ? (
                  <img src={draft.logoDataUrl} alt="" className="h-12 w-12 rounded-xl object-contain" />
                ) : (
                  <span className="text-[10px] text-white/80">Icon</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .input-base { margin-top: 0.25rem; width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input-base:focus { border-color: rgb(16 185 129); box-shadow: 0 0 0 2px rgb(16 185 129 / 0.2); }
      `}</style>
    </div>
  );
}

function normalizeCustomHostClient(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.replace(/^https?:\/\//u, "");
  s = (s.split("/")[0] ?? "").split(":")[0] ?? "";
  return s.replace(/^\.+|\.+$/gu, "");
}

function customDomainStepOk(raw: string): boolean {
  const h = normalizeCustomHostClient(raw);
  if (!h || h.length > 253 || h.includes("..")) return false;
  const labels = h.split(".");
  if (labels.length < 2) return false;
  for (const lb of labels) {
    if (!lb.length || lb.length > 63) return false;
    if (!/^[a-z0-9-]+$/iu.test(lb) || lb.startsWith("-") || lb.endsWith("-")) return false;
  }
  return true;
}

function devPreviewForSlug(slug: string, preview: StoreUrlPreview | null): string {
  if (!preview) return `http://${slug}.localhost:3000`;
  try {
    const u = new URL(preview.devPreviewUrl);
    const port = u.port || "3000";
    return `http://${slug}.localhost:${port}`;
  } catch {
    return `http://${slug}.localhost:3000`;
  }
}

type SubdomainAvailState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; value: SubdomainAvailability };

function Step4({
  draft,
  persist,
  onDomainStepValidityChange,
}: {
  draft: OnboardingDraft;
  persist: (d: OnboardingDraft) => void;
  onDomainStepValidityChange: (ok: boolean) => void;
}) {
  const [preview, setPreview] = useState<StoreUrlPreview | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [avail, setAvail] = useState<SubdomainAvailState>({ kind: "idle" });
  /** Subdomain slug when user opened "Change subdomain" (Cancel restores this). */
  const subdomainRevertRef = useRef<string>("");
  const [subdomainEditing, setSubdomainEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const brand = draft.storeDisplayName.trim();
    setPreviewLoading(true);
    setPreviewErr(null);
    void fetchStoreUrlPreview(brand || undefined)
      .then((p) => {
        if (!cancelled) {
          setPreview(p);
          setPreviewErr(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPreview(null);
          setPreviewErr(e instanceof ApiError ? e.message : "Could not load URL preview.");
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.storeDisplayName]);

  useEffect(() => {
    if (draft.domainMode !== "subdomain") {
      setSubdomainEditing(false);
    }
  }, [draft.domainMode]);

  useEffect(() => {
    if (!preview || draft.domainMode !== "subdomain") return;
    if (draft.subdomain.trim()) return;
    persist({ ...draft, subdomain: preview.subdomain });
    // Intentionally omit draft.subdomain / persist from deps: seed once when preview arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, draft.domainMode]);

  useEffect(() => {
    if (draft.domainMode !== "subdomain") {
      setAvail({ kind: "idle" });
      return;
    }
    const raw = draft.subdomain.trim();
    if (!raw) {
      setAvail({ kind: "idle" });
      return;
    }
    setAvail({ kind: "loading" });
    const t = window.setTimeout(() => {
      void fetchSubdomainAvailability(raw)
        .then((v) => setAvail({ kind: "result", value: v }))
        .catch(() =>
          setAvail({
            kind: "result",
            value: { normalized: "", available: false, reason: "invalid" },
          }),
        );
    }, 420);
    return () => window.clearTimeout(t);
  }, [draft.subdomain, draft.domainMode]);

  useEffect(() => {
    if (draft.domainMode === "custom") {
      onDomainStepValidityChange(customDomainStepOk(draft.customDomain));
      return;
    }
    if (!draft.storeDisplayName.trim()) {
      onDomainStepValidityChange(false);
      return;
    }
    const sub = draft.subdomain.trim();
    if (!sub) {
      onDomainStepValidityChange(false);
      return;
    }
    if (avail.kind === "loading" || avail.kind === "idle") {
      onDomainStepValidityChange(false);
      return;
    }
    const v = avail.value;
    onDomainStepValidityChange(Boolean(v.available && v.normalized.length > 0));
  }, [
    draft.domainMode,
    draft.customDomain,
    draft.subdomain,
    draft.storeDisplayName,
    avail,
    onDomainStepValidityChange,
  ]);

  const platformSuffix = preview?.platformDomain ?? "platform.app";
  const displaySlug =
    avail.kind === "result" && avail.value.available && avail.value.normalized
      ? avail.value.normalized
      : draft.subdomain.trim() || preview?.subdomain || "";

  const productionHttps = `https://${displaySlug}.${platformSuffix}`;
  const localDevUrl = devPreviewForSlug(displaySlug || "store", preview);

  const canCloseSubdomainEdit =
    avail.kind === "result" && avail.value.available && Boolean(avail.value.normalized);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Choose your store domain</h2>
      <p className="mt-1 text-sm text-slate-600">
        We suggest a free subdomain from your store name (step 3). You can change it if you like, or use your own
        domain.
      </p>

      {draft.domainMode === "subdomain" && !subdomainEditing ? (
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">Your store URL</p>
          {previewLoading ? (
            <p className="mt-3 text-sm text-slate-600">Preparing your link…</p>
          ) : previewErr ? (
            <p className="mt-3 text-sm text-red-700">{previewErr}</p>
          ) : (
            <>
              <p className="mt-2 break-all font-mono text-lg font-semibold text-slate-900">{productionHttps}</p>
              <div className="mt-4 border-t border-emerald-100/80 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Local development</p>
                <p className="mt-1 break-all font-mono text-sm text-slate-700">{localDevUrl}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {avail.kind === "loading" ? (
                  <span className="text-sm text-slate-500">Checking subdomain…</span>
                ) : avail.kind === "result" && avail.value.available ? (
                  <span className="text-sm font-medium text-emerald-700">Available</span>
                ) : avail.kind === "result" ? (
                  <span className="text-sm font-medium text-amber-800">Update subdomain to continue</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    subdomainRevertRef.current = draft.subdomain;
                    setSubdomainEditing(true);
                  }}
                  className="text-sm font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900"
                >
                  Change subdomain
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {draft.domainMode === "subdomain" && subdomainEditing ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-900">Edit subdomain</p>
          <p className="mt-1 text-xs text-slate-500">Letters, numbers, and hyphens only. This becomes your store address.</p>
          <div className="mt-3 flex flex-wrap items-center gap-1 font-mono text-sm">
            <span className="text-slate-400">[</span>
            <input
              type="text"
              value={draft.subdomain}
              onChange={(e) => persist({ ...draft, subdomain: e.target.value })}
              className="min-w-[10rem] max-w-[16rem] rounded border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-slate-900 outline-none focus:border-emerald-500"
              placeholder="your-store"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="text-slate-400">]</span>
            <span className="text-slate-600">.{platformSuffix}</span>
          </div>
          {draft.subdomain.trim() ? (
            <div className="mt-3 text-sm">
              {avail.kind === "loading" ? (
                <span className="text-slate-500">Checking availability…</span>
              ) : avail.kind === "result" ? (
                avail.value.available ? (
                  <span className="text-emerald-700">Available</span>
                ) : (
                  <div className="space-y-2">
                    <span className="text-red-700">Already taken</span>
                    {avail.value.suggestion ? (
                      <div className="flex flex-wrap items-center gap-2 text-slate-700">
                        <span className="text-xs text-slate-600">Suggested:</span>
                        <span className="font-mono text-xs">
                          {avail.value.suggestion}.{platformSuffix}
                        </span>
                        <button
                          type="button"
                          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                          onClick={() => {
                            if (avail.kind !== "result") return;
                            persist({ ...draft, subdomain: avail.value.suggestion ?? draft.subdomain });
                          }}
                        >
                          Use suggestion
                        </button>
                      </div>
                    ) : null}
                    {avail.value.reason === "invalid" ? (
                      <p className="text-xs text-slate-600">
                        Use 2–63 characters: lowercase letters, numbers, and hyphens (not at the start or end).
                      </p>
                    ) : null}
                  </div>
                )
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canCloseSubdomainEdit}
              onClick={() => setSubdomainEditing(false)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                persist({ ...draft, subdomain: subdomainRevertRef.current });
                setSubdomainEditing(false);
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {draft.domainMode === "custom" && customDomainStepOk(draft.customDomain) ? (
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">Your store URL</p>
          <p className="mt-2 break-all font-mono text-lg font-semibold text-slate-900">
            https://{normalizeCustomHostClient(draft.customDomain)}
          </p>
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <input
            type="radio"
            name="domainMode"
            className="mt-1"
            checked={draft.domainMode === "subdomain"}
            onChange={() => persist({ ...draft, domainMode: "subdomain" })}
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900">Free subdomain (recommended)</p>
            <p className="mt-1 text-xs text-slate-500">
              Hosted on our domain{subdomainEditing ? "" : " — your link is shown above."}
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <input
            type="radio"
            name="domainMode"
            className="mt-1"
            checked={draft.domainMode === "custom"}
            onChange={() => persist({ ...draft, domainMode: "custom" })}
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900">Use my own domain</p>
            <input
              type="text"
              disabled={draft.domainMode !== "custom"}
              value={draft.customDomain}
              onChange={(e) => persist({ ...draft, customDomain: e.target.value })}
              className="mt-2 w-full max-w-md rounded border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
              placeholder="www.example.com"
              autoComplete="off"
              spellCheck={false}
            />
            {draft.domainMode === "custom" ? (
              <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
                Point your domain&apos;s DNS to our servers after setup. You can also configure this later in
                settings. This step only saves your choice.
              </div>
            ) : null}
            {draft.domainMode === "custom" && draft.customDomain.trim() && !customDomainStepOk(draft.customDomain) ? (
              <p className="mt-2 text-xs text-red-700">Enter a valid hostname (e.g. www.yourstore.com).</p>
            ) : null}
          </div>
        </label>
      </div>

      {preview?.message && draft.domainMode === "subdomain" && !subdomainEditing ? (
        <p className="mt-6 text-sm text-slate-600">{preview.message}</p>
      ) : null}
      {draft.domainMode === "custom" ? (
        <p className="mt-4 text-xs text-slate-500">
          The backend resolves your store from the request <span className="font-mono">Host</span> (custom domain or{" "}
          <span className="font-mono">{'{subdomain}'}.localhost</span> in development).
        </p>
      ) : null}
    </div>
  );
}

function Step5({
  draft,
  persist,
  industries,
  themes,
  themesLoading,
  themesError,
  themeCombos,
  themeCombosLoading,
  themeCombosError,
  industryFilter,
  onIndustryFilterChange,
}: {
  draft: OnboardingDraft;
  persist: (d: OnboardingDraft) => void;
  industries: PublicIndustry[];
  themes: PublicTheme[];
  themesLoading: boolean;
  themesError: string | null;
  themeCombos: PublicThemeCombo[];
  themeCombosLoading: boolean;
  themeCombosError: string | null;
  industryFilter: string;
  onIndustryFilterChange: (industry: string) => void;
}) {
  const industryOptions = useMemo(
    () =>
      [
        "generic",
        ...Array.from(
          new Set(industries.map((industry) => industry.name?.trim()).filter(Boolean) as string[]),
        ).sort((left, right) => left.localeCompare(right)),
      ],
    [industries],
  );
  const industryFilterLabel = normalizeIndustryKey(industryFilter) === "generic" ? "All Industry" : industryFilter;

  const webThemes = themes.filter((t) => (t.themeChannel ?? "WEB").toUpperCase() === "WEB");
  const mobileThemes = themes.filter((t) => (t.themeChannel ?? "").toUpperCase() === "MOBILE");
  const matchedWebThemes = webThemes.filter((t) => themeMatchesIndustry(t, industryFilter));
  const matchedMobileThemes = mobileThemes.filter((t) => themeMatchesIndustry(t, industryFilter));
  const matchedThemeCombos = themeCombos.filter((c) => comboMatchesIndustry(c, industryFilter));
  const filteredWebThemes = matchedWebThemes;
  const filteredMobileThemes = matchedMobileThemes;
  const filteredThemeCombos = matchedThemeCombos;
  const noIndustryThemes =
    Boolean(industryFilter) &&
    matchedWebThemes.length === 0 &&
    matchedMobileThemes.length === 0 &&
    matchedThemeCombos.length === 0;
  const selected = filteredWebThemes.find((t) => t.id === draft.themeId) ?? null;
  const selectedMobile = filteredMobileThemes.find((t) => t.id === draft.mobileThemeId) ?? null;
  const selectedCombo = filteredThemeCombos.find((c) => c.id === draft.comboId) ?? null;
  const isComboMode = draft.platform === "website_and_mobile";

  if (themesLoading || (isComboMode && themeCombosLoading)) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Theme</h2>
        <p className="mt-1 text-sm text-slate-600">Loading available themes from backend…</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Theme</h2>
      <p className="mt-1 text-sm text-slate-600">Choose from Web, Mobile, or pre-matched Combo themes.</p>
      <div className="mt-4 max-w-sm">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Industry filter
        </label>
        <select
          className="input-base mt-1"
          value={industryFilter}
          onChange={(event) => onIndustryFilterChange(event.target.value)}
          disabled={industryOptions.length === 0}
        >
          {industryOptions.length === 0 ? <option value="">No industries available</option> : null}
          {industryOptions.map((industry) => (
            <option key={industry} value={industry}>
              {industry === "generic" ? "All Industry" : industry}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-500">
          All Industry shows only Generic / all-industries themes. Other options show exact industry themes.
        </p>
      </div>
      {noIndustryThemes ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          No active theme is uploaded for <strong>{industryFilterLabel}</strong>. Ask the Super Admin to upload a web or
          mobile theme tagged with this exact industry.
        </p>
      ) : null}
      {themesError ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {themesError}
        </p>
      ) : null}
      {isComboMode && themeCombosError ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {themeCombosError}
        </p>
      ) : null}
      {webThemes.length === 0 ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No active web themes found in DB. Ask admin to activate/upload themes in platform settings.
        </p>
      ) : null}
      {isComboMode && mobileThemes.length === 0 ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No active mobile themes found in DB. Add mobile themes before continuing website + mobile onboarding.
        </p>
      ) : null}
      {isComboMode && themeCombos.length === 0 ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          No combo packs configured yet. You can still pick web and mobile themes separately below.
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Combo Theme (Recommended)</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {filteredThemeCombos.map((combo) => {
                const active = draft.comboId === combo.id;
                return (
                  <button
                    key={combo.id}
                    type="button"
                    onClick={() =>
                      persist({
                        ...draft,
                        comboId: combo.id,
                        themeId: combo.webThemeId,
                        mobileThemeId: combo.mobileThemeId,
                      })
                    }
                    className={`rounded-xl border-2 p-4 text-left text-sm transition ${
                      active ? "border-emerald-600 bg-emerald-50/50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {combo.previewImage ? (
                      <img
                        src={combo.previewImage}
                        alt={combo.name}
                        className="mb-3 h-24 w-full rounded-lg border border-slate-200 object-cover"
                      />
                    ) : null}
                    <div className="font-semibold text-slate-900">{combo.name}</div>
                    <div className="mt-1 text-xs text-slate-600">Web: {combo.webThemeName}</div>
                    <div className="text-xs text-slate-600">Mobile: {combo.mobileThemeName}</div>
                  </button>
                );
              })}
          </div>
          {filteredThemeCombos.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">No combo themes for this filter.</p>
          ) : null}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Web Theme</p>
            <div className="mt-2 grid gap-3">
              {filteredWebThemes.map((t) => {
                  const active = draft.themeId === t.id;
                  const preview = t.previewImage || t.previewImages?.[0] || "";
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => persist({ ...draft, themeId: t.id, comboId: "" })}
                      className={`rounded-xl border-2 p-4 text-left text-sm transition ${
                        active ? "border-emerald-600 bg-emerald-50/50" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {preview ? (
                        <img
                          src={preview}
                          alt={t.themeName}
                          className="mb-3 h-20 w-full rounded-lg border border-slate-200 object-cover"
                        />
                      ) : null}
                      <div className="font-semibold text-slate-900">{t.themeName}</div>
                      <div className="mt-1 text-xs text-slate-600">{t.themeType || "Web theme"}</div>
                    </button>
                  );
                })}
            </div>
            {filteredWebThemes.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No web themes for this filter.</p>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mobile Theme</p>
            <div className="mt-2 grid gap-3">
              {filteredMobileThemes.map((t) => {
                  const active = draft.mobileThemeId === t.id;
                  const preview = t.previewImage || t.previewImages?.[0] || "";
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => persist({ ...draft, mobileThemeId: t.id, comboId: "" })}
                      className={`rounded-xl border-2 p-4 text-left text-sm transition ${
                        active ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {preview ? (
                        <img
                          src={preview}
                          alt={t.themeName}
                          className="mb-3 h-20 w-full rounded-lg border border-slate-200 object-cover"
                        />
                      ) : null}
                      <div className="font-semibold text-slate-900">{t.themeName}</div>
                      <div className="mt-1 text-xs text-slate-600">{t.themeType || "Mobile theme"}</div>
                    </button>
                  );
                })}
            </div>
            {filteredMobileThemes.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No mobile themes for this filter.</p>
            ) : null}
          </div>
        </div>
      </div>
      {isComboMode && selectedCombo ? (
        <p className="mt-4 text-xs text-slate-600">
          Selected combo: <span className="font-medium text-slate-800">{selectedCombo.name}</span> (Web:{" "}
          {selectedCombo.webThemeName}, Mobile: {selectedCombo.mobileThemeName})
        </p>
      ) : null}
      {isComboMode && selectedMobile ? (
        <p className="mt-2 text-xs text-slate-600">
          Selected mobile theme: <span className="font-medium text-slate-800">{selectedMobile.themeName}</span>
        </p>
      ) : null}
      {!isComboMode && selected ? (
        <p className="mt-4 text-xs text-slate-600">
          Selected theme: <span className="font-medium text-slate-800">{selected.themeName}</span>
        </p>
      ) : null}
    </div>
  );
}

type PackageCheckState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "invalid"; message: string }
  | { kind: "result"; value: CheckPackageResponse };

function Step6({
  draft,
  persist,
  onAppPackageValidityChange,
}: {
  draft: OnboardingDraft;
  persist: (d: OnboardingDraft) => void;
  onAppPackageValidityChange: (ok: boolean) => void;
}) {
  const [pkgCheck, setPkgCheck] = useState<PackageCheckState>({ kind: "idle" });

  useEffect(() => {
    return () => onAppPackageValidityChange(false);
  }, [onAppPackageValidityChange]);

  useEffect(() => {
    const pkgRaw = draft.appPackage.trim().toLowerCase();
    if (!draft.appName.trim() || !pkgRaw) {
      setPkgCheck({ kind: "idle" });
      return;
    }
    if (!isValidCubePackageName(pkgRaw)) {
      setPkgCheck({
        kind: "invalid",
        message:
          "After co.cube. use only lowercase letters and numbers (no spaces). At least 3 characters, e.g. abcdistributors.",
      });
      return;
    }
    setPkgCheck({ kind: "loading" });
    const t = window.setTimeout(() => {
      void fetchCheckPackage(pkgRaw)
        .then((value) => setPkgCheck({ kind: "result", value }))
        .catch(() =>
          setPkgCheck({
            kind: "result",
            value: {
              available: false,
              normalized: pkgRaw,
              playStoreChecked: false,
            },
          }),
        );
    }, 420);
    return () => window.clearTimeout(t);
  }, [draft.appPackage, draft.appName]);

  useEffect(() => {
    if (!draft.appName.trim()) {
      onAppPackageValidityChange(false);
      return;
    }
    if (pkgCheck.kind === "idle" || pkgCheck.kind === "loading" || pkgCheck.kind === "invalid") {
      onAppPackageValidityChange(false);
      return;
    }
    onAppPackageValidityChange(Boolean(pkgCheck.value.available));
  }, [draft.appName, pkgCheck, onAppPackageValidityChange]);

  const previewTitle = draft.appName.trim() || "Your store";
  const pkgDisplay = draft.appPackage.trim().toLowerCase();

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Configure your mobile app</h2>
      <p className="mt-1 text-sm text-slate-600">
        App name defaults from your store name. The package id always starts with{" "}
        <span className="font-mono">{PACKAGE_PREFIX}</span>
        — only the last part is editable. We check format and availability (our platform + Play Store).
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Play Store preview</p>
        <p className="mt-1 font-medium text-slate-900">{previewTitle}</p>
        <p className="text-xs text-slate-600">by Cube</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="App name *" className="sm:col-span-2">
          <input
            className="input-base"
            value={draft.appName}
            onChange={(e) => persist({ ...draft, appName: e.target.value })}
            placeholder={defaultAppNameFromBrand(draft.storeDisplayName)}
          />
        </Field>
        <Field label="Package name *" className="sm:col-span-2">
          <div className="mt-1 flex min-w-0 max-w-full flex-wrap items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
            <span className="shrink-0 select-none text-slate-500">{PACKAGE_PREFIX}</span>
            <input
              className="min-w-[6rem] flex-1 border-0 bg-transparent p-0.5 text-slate-900 outline-none ring-0"
              value={suffixFromFullPackage(draft.appPackage)}
              onChange={(e) =>
                persist({ ...draft, appPackage: fullPackageFromSuffix(e.target.value) })
              }
              placeholder={suffixFromFullPackage(defaultPackageNameFromBrand(draft.storeDisplayName || "store"))}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="mt-2 min-h-[1.5rem] text-sm">
            {pkgCheck.kind === "loading" ? (
              <span className="text-slate-500">Checking availability…</span>
            ) : pkgCheck.kind === "invalid" ? (
              <span className="text-red-700">{pkgCheck.message}</span>
            ) : pkgCheck.kind === "result" ? (
              pkgCheck.value.available ? (
                <span className="text-emerald-700">Package name available</span>
              ) : (
                <span className="text-red-700">
                  {pkgCheck.value.reason === "taken_platform"
                    ? "Already used on this platform"
                    : pkgCheck.value.reason === "taken_play_store"
                      ? "Already used (found on Google Play)"
                      : pkgCheck.value.reason === "invalid_format"
                        ? "Invalid package id"
                        : !pkgCheck.value.playStoreChecked && !pkgCheck.value.reason
                          ? "Could not verify package. Check your connection and try again."
                          : "Not available"}
                </span>
              )
            ) : null}
          </div>
          {pkgCheck.kind === "result" && pkgCheck.value.available && !pkgCheck.value.playStoreChecked ? (
            <p className="mt-1 text-xs text-amber-800">
              Play Store could not be checked (network). Only our platform database was verified — pick a unique id
              before release.
            </p>
          ) : null}
        </Field>
        <Field label="Splash color">
          <input
            type="color"
            className="mt-1 h-10 w-full cursor-pointer rounded border border-slate-200"
            value={draft.splashColor}
            onChange={(e) => persist({ ...draft, splashColor: e.target.value })}
          />
        </Field>
      </div>
      {pkgDisplay ? (
        <p className="mt-4 text-xs text-slate-500">
          Play Store listing URL used for checks:{" "}
          <a
            className="break-all font-mono text-emerald-800 underline"
            href={`https://play.google.com/store/apps/details?id=${encodeURIComponent(pkgDisplay)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            https://play.google.com/store/apps/details?id={pkgDisplay}
          </a>
        </p>
      ) : null}
      <style>{`
        .input-base { margin-top: 0.25rem; width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input-base:focus { border-color: rgb(16 185 129); box-shadow: 0 0 0 2px rgb(16 185 129 / 0.2); }
      `}</style>
    </div>
  );
}

function Step7({ draft }: { draft: OnboardingDraft }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Finish setup</h2>
      <p className="mt-2 text-sm text-slate-600">
        Your answers are saved as tenant configuration (profile, branding, domain, theme
        {draft.platform === "website_and_mobile" ? ", and app metadata" : ""}). Nothing is compiled during this
        wizard so onboarding stays fast and reliable.
      </p>
      <ul className="mt-6 space-y-2 text-sm text-slate-700">
        <li className="flex gap-2">
          <span className="text-emerald-600">✓</span>
          <span>
            <span className="font-medium text-slate-900">Website</span> — uses your theme, colours, and domain when
            visitors open your store URL (no separate static build required).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-emerald-600">OK</span>
          <span>
            <span className="font-medium text-slate-900">Language</span> -{" "}
            {(draft.selectedLanguageCode || "en").toUpperCase()} is saved for website and mobile app generation.
          </span>
        </li>
        {draft.platform === "website_and_mobile" ? (
          <li className="flex gap-2">
            <span className="text-amber-600">◇</span>
            <span>
              <span className="font-medium text-slate-900">Mobile app</span> — name and package are stored; generate
              the APK from the dashboard when you are ready (build worker hooks in later).
            </span>
          </li>
        ) : (
          <li className="flex gap-2">
            <span className="text-slate-400">—</span>
            <span className="text-slate-600">Mobile app not included (website only).</span>
          </li>
        )}
      </ul>
      <p className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-950">
        Click <span className="font-semibold">Finish &amp; go to dashboard</span> to save everything and open your
        distributor home. You will see website and app status there, with a button to start a mobile build when the
        pipeline is connected.
      </p>
    </div>
  );
}

type DownwardSelectOption = {
  value: string;
  label: string;
};

function DownwardSelect({
  value,
  options,
  placeholder,
  searchPlaceholder,
  disabled,
  onChange,
}: {
  value: string;
  options: DownwardSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const selected = options.find((opt) => opt.value === value) ?? null;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleOptions = normalizedQuery
    ? options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedQuery))
    : options;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setQuery("");
    }
  }, [disabled]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    if (!searchPlaceholder) return;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, searchPlaceholder]);

  return (
    <div ref={rootRef} className="relative mt-1">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="input-base flex min-h-10 items-center justify-between gap-2 bg-white text-left disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={selected ? "truncate text-slate-900" : "truncate text-slate-500"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && !disabled ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          {searchPlaceholder ? (
            <div className="border-b border-slate-200 bg-white p-2">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    setOpen(false);
                  }
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder.replace(/\.{3}$/, "")}
                autoComplete="off"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          ) : null}
          <div className="max-h-56 overflow-y-auto py-1">
          {visibleOptions.length ? (
            visibleOptions.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-sm text-slate-500">
              {normalizedQuery ? "No matching options found." : placeholder}
            </div>
          )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium text-slate-800 ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}
