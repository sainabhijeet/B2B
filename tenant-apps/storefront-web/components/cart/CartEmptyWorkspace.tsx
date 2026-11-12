import Link from "next/link";
import { translate } from "@/lib/translation-engine";

export default function CartEmptyWorkspace({ languageCode }: { languageCode: string }) {
  const t = (value: string) => translate(value, languageCode);

  return (
    <section className="cart-empty-workspace mt-8 overflow-hidden border border-[#aac8d3] bg-white shadow-[0_24px_60px_rgba(6,47,69,0.09)]">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative overflow-hidden bg-[#062f45] px-6 py-9 text-white sm:px-9 sm:py-11">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[38px] border-[#0879ad]/20" aria-hidden="true" />
          <p className="relative text-[10px] font-black uppercase tracking-[0.2em] text-[#72c4e6]">{t("Trade order workspace")}</p>
          <h2 className="relative mt-3 max-w-md text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">{t("Build your product shortlist.")}</h2>

          <div className="relative mt-8 border border-white/15 bg-white/[0.06] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-white/15 pb-3">
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/55">{t("Order list")}</span>
              <span className="text-[9px] font-bold text-[#72c4e6]">0 {t("items")}</span>
            </div>
            {["Select coating system", "Set quantities", "Review before checkout"].map((label, index) => (
              <div key={label} className="flex items-center gap-3 border-b border-white/10 py-3 last:border-b-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/20 text-[9px] font-black text-[#72c4e6]">0{index + 1}</span>
                <span className="flex-1 text-sm font-bold text-white/85">{t(label)}</span>
                <span className="text-lg text-white/35" aria-hidden="true">+</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-12">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("Your cart is ready to begin")}</p>
          <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight tracking-[-0.035em] text-[#08283d] sm:text-4xl">{t("Add the products you need for your next trade order.")}</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">{t("Compare coating systems, choose quantities and keep everything together before moving to checkout.")}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/category" className="inline-flex min-h-12 items-center bg-[#0879ad] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#05648f]">
              {t("Browse products")} <span className="ml-3" aria-hidden="true">→</span>
            </Link>
            <Link href="/bulk-orders" className="inline-flex min-h-12 items-center border border-[#9fc4d2] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-[#062f45] transition hover:border-[#0879ad]">
              {t("Plan volume order")}
            </Link>
          </div>

          <p className="mt-7 border-t border-[#d6e4e8] pt-4 text-xs leading-6 text-slate-500">{t("Prices, availability and delivery details are confirmed before the order is placed.")}</p>
        </div>
      </div>

      <div className="grid border-t border-[#bcd3dc] bg-[#edf5f7] sm:grid-cols-3">
        {[
          ["01", "Editable quantities", "Adjust every line before checkout"],
          ["02", "Clear order summary", "Review products and totals together"],
          ["03", "Buyer support", "Get help with larger requirements"],
        ].map(([number, title, copy]) => (
          <div key={title} className="grid grid-cols-[34px_1fr] gap-3 border-b border-[#c9dce3] px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
            <span className="text-[10px] font-black tracking-[0.12em] text-[#0879ad]">{number}</span>
            <div><strong className="block text-xs font-black text-[#08283d]">{t(title)}</strong><span className="mt-1 block text-[11px] leading-5 text-slate-500">{t(copy)}</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}
