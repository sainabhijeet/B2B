import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

export async function POST() {
  return proxyNestResponse(
    await storefrontAuthedFetch("/storefront/customers/account-deletion/otp", {
      method: "POST",
    }),
  );
}
