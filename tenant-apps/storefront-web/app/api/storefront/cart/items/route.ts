import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

export async function POST(req: Request) {
  const body = await req.text();
  return proxyNestResponse(
    await storefrontAuthedFetch("/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );
}
