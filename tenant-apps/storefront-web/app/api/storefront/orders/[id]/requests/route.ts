import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { proxyNestResponse } from "@/lib/proxyNestResponse";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const contentType = req.headers.get("content-type") ?? "";
  const multipart = contentType.toLowerCase().startsWith("multipart/form-data");
  return proxyNestResponse(
    await storefrontAuthedFetch(`/orders/${encodeURIComponent(id)}/requests`, {
      method: "POST",
      ...(multipart ? {} : { headers: { "Content-Type": "application/json" } }),
      body: multipart ? await req.formData() : await req.text(),
    }),
  );
}
