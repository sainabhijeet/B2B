import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

export async function POST(req: Request) {
  const raw = await req.text();
  return proxyNestResponse(
    await storefrontAuthedFetch("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw && raw.trim() ? raw : "{}",
    }),
  );
}
