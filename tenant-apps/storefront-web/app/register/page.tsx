import { redirect } from "next/navigation";

/** The mobile storefront only supports OTP sign-in; keep old links usable. */
export default function RegisterPage() {
  redirect("/login");
}
