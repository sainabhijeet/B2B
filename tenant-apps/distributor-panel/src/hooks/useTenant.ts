import { useAuth } from "@/hooks/useAuth";

/** Tenant id from JWT (null if missing). */
export function useTenant() {
  const { tenantId } = useAuth();
  return { tenantId };
}
