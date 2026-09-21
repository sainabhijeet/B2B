import type { OnboardingDraft } from "@/types/onboarding";

const key = (tenantId: string) => `distributor_onboarding_${tenantId}`;

export type StoredOnboarding = {
  version: 1;
  status: "draft" | "complete";
  draft: OnboardingDraft;
  completedAt?: string;
};

export function readOnboarding(tenantId: string): StoredOnboarding | null {
  try {
    const raw = localStorage.getItem(key(tenantId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredOnboarding;
  } catch {
    return null;
  }
}

export function writeOnboarding(tenantId: string, value: StoredOnboarding): void {
  localStorage.setItem(key(tenantId), JSON.stringify(value));
}

/** Only `status: complete` unlocks the app; missing or draft ⇒ wizard required. */
export function isOnboardingComplete(tenantId: string): boolean {
  return readOnboarding(tenantId)?.status === "complete";
}

export function markOnboardingComplete(tenantId: string, draft: OnboardingDraft): void {
  writeOnboarding(tenantId, {
    version: 1,
    status: "complete",
    draft,
    completedAt: new Date().toISOString(),
  });
}

export function saveOnboardingDraft(tenantId: string, draft: OnboardingDraft): void {
  writeOnboarding(tenantId, {
    version: 1,
    status: "draft",
    draft,
  });
}
