import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData?.get("file")) {
    return Response.json({ message: "Profile image is required." }, { status: 400 });
  }
  return proxyNestResponse(await storefrontAuthedFetch("/storefront/customer/me/avatar", {
    method: "POST",
    body: formData,
  }));
}
