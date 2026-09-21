export type PlatformChoice = "website" | "website_and_mobile";

export type OnboardingDraft = {
  businessName: string;
  ownerName: string;
  /** Login mobile (read-only in wizard; saved to profile on complete). */
  phone: string;
  /** `industries.industry_id` from GET /industries. */
  industry: string;
  /** `countries.id` from GET /countries. */
  countryId: string;
  /** `geo_states.state_id` from GET /locations/states. */
  stateId: string;
  /** `geo_cities.city_id` from GET /locations/cities. */
  cityId: string;
  /** Display labels (synced from API rows). */
  country: string;
  state: string;
  city: string;
  gst: string;
  gstVerified: boolean;
  gstLegalName: string;
  /** GST registry jurisdiction state label (not geo `stateId`). */
  gstApiState: string;
  gstApiStatus: string;
  address: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
  platform: PlatformChoice | "";
  storeDisplayName: string;
  /** Fixed platform style for AI (always modern minimal in UI). */
  brandStyle: string;
  logoDataUrl: string;
  primaryColor: string;
  secondaryColor: string;
  tagline: string;
  selectedLanguageCode: string;
  domainMode: "subdomain" | "custom";
  subdomain: string;
  customDomain: string;
  themeId: string;
  mobileThemeId: string;
  comboId: string;
  appName: string;
  appPackage: string;
  splashColor: string;
};

export const emptyOnboardingDraft = (): OnboardingDraft => ({
  businessName: "",
  ownerName: "",
  phone: "",
  industry: "",
  countryId: "",
  stateId: "",
  cityId: "",
  country: "",
  state: "",
  city: "",
  gst: "",
  gstVerified: false,
  gstLegalName: "",
  gstApiState: "",
  gstApiStatus: "",
  address: "",
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  branch: "",
  upiId: "",
  platform: "website",
  storeDisplayName: "",
  brandStyle: "modern minimal",
  logoDataUrl: "",
  primaryColor: "#0d9488",
  secondaryColor: "#134e4a",
  tagline: "",
  selectedLanguageCode: "en",
  domainMode: "subdomain",
  subdomain: "",
  customDomain: "",
  themeId: "",
  mobileThemeId: "",
  comboId: "",
  appName: "",
  appPackage: "",
  splashColor: "#0f766e",
});
