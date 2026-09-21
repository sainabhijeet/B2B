import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";
import DeleteAccountForm from "@/components/DeleteAccountForm";

export default async function DeleteAccountPage() {
  const language = await getStorefrontLanguage();
  const t = (text: string) => translate(text, language);

  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-950">
          {t("Delete account")}
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          {t(
            "Request an OTP on your registered mobile number to permanently delete your retailer account.",
          )}
        </p>
        <DeleteAccountForm
          labels={{
            requestOtp: t("Send deletion OTP"),
            otpSent: t("OTP sent to your registered mobile number."),
            otpLabel: t("Verification code"),
            deleteAccount: t("Permanently delete account"),
            confirmation: t("This permanently removes your personal account data. Continue?"),
            signInRequired: t("Sign in before requesting account deletion."),
            failed: t("Account deletion could not be completed."),
          }}
        />
        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            {t("What is deleted")}
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-700">
            <li>{t("Personal profile details")}</li>
            <li>{t("Saved delivery addresses")}</li>
            <li>{t("Cart and storefront preferences linked to the account")}</li>
            <li>{t("Sign-in sessions and authentication data")}</li>
          </ul>
        </section>
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            {t("What is retained")}
          </h2>
          <p className="mt-3 leading-7 text-slate-600">
            {t(
              "Invoices, order records, tax records and credit ledger entries may be retained where required for legal, accounting, security, fraud prevention or regulatory reasons.",
            )}
          </p>
        </section>
      </main>
    </StorefrontLocaleFrame>
  );
}
