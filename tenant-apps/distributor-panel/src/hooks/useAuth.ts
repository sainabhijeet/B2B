import { getAccessToken, getAuthSession } from "@/lib/authStorage";
import {
  getRoleFromAccessToken,
  getTenantIdFromAccessToken,
  isStaffReadOnly,
} from "@/lib/jwtParse";

/** Reads JWT from storage each render (login/logout remounts or navigates). */
export function useAuth() {
  const accessToken = getAccessToken();
  const session = getAuthSession();
  return {
    accessToken,
    tenantId: session?.tenantId ?? getTenantIdFromAccessToken(accessToken),
    role: session?.role ?? getRoleFromAccessToken(accessToken),
    staffReadOnly: session ? session.role === "STAFF" : isStaffReadOnly(accessToken),
  };
}
