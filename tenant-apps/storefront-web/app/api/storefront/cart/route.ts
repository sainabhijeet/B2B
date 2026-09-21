import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

export async function GET() {
  return proxyNestResponse(await storefrontAuthedFetch("/cart"));
}
