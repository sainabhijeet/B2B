import { cookies } from "next/headers";
import {
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_DEVICE_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
} from "@/lib/customer-session-cookies";

/** Clears storefront customer session cookies; redirects home when opened as an HTML form POST. */
export async function POST(req: Request) {
  const jar = await cookies();
  jar.delete(CUSTOMER_ACCESS_COOKIE);
  jar.delete(CUSTOMER_REFRESH_COOKIE);
  jar.delete(CUSTOMER_DEVICE_COOKIE);
  const origin = new URL(req.url).origin;
  return Response.redirect(`${origin}/`, 303);
}
