import { cookies } from "next/headers";
import {
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_DEVICE_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
} from "@/lib/customer-session-cookies";
import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";

export async function DELETE(req: Request) {
  const body = await req.text();
  const response = await storefrontAuthedFetch("/storefront/customer/me", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const text = await response.text();
  if (response.ok) {
    const jar = await cookies();
    jar.delete(CUSTOMER_ACCESS_COOKIE);
    jar.delete(CUSTOMER_REFRESH_COOKIE);
    jar.delete(CUSTOMER_DEVICE_COOKIE);
  }
  return new Response(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}
