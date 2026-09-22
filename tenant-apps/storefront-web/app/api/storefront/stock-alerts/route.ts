import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

export async function GET() {
  return proxyNestResponse(await storefrontAuthedFetch("/stock-alerts"));
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyNestResponse(await storefrontAuthedFetch("/stock-alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }));
}
