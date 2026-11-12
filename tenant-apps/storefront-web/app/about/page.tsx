import type { Metadata } from "next";
import Link from "next/link";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import ThemedContentPage from "@/components/ThemedContentPage";
import { storefrontDisplayName, resolveStorefrontTheme } from "@/lib/resolve-storefront-theme";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about our business-first sourcing experience, service standards and ordering process.",
};

const strengths = [
  {
    number: "01",
    title: "Curated trade catalogue",
    description: "Explore focused product collections built for retailers, offices and professional buyers.",
  },
  {
    number: "02",
    title: "Bulk-ready ordering",
    description: "Plan quantities, compare products and request commercial support for larger requirements.",
  },
  {
    number: "03",
    title: "Dependable buyer support",
    description: "Get clear assistance from product discovery and order planning through fulfilment.",
  },
];

const steps = [
  ["Discover", "Browse organised categories and shortlist products suited to your business."],
  ["Plan", "Review product information, availability and the quantities you require."],
  ["Order", "Place your order or contact the trade desk for a tailored bulk requirement."],
];

export default async function AboutPage() {
  const [language, resolved] = await Promise.all([
    getStorefrontLanguage(),
    resolveStorefrontTheme(),
  ]);
  const t = (text: string) => translate(text, language);
  const storeName = storefrontDisplayName(resolved);
  const industryName = resolved.branding?.industryName?.trim() || "B2B commerce";
  const isCoatCraftTheme = resolved.storefrontKey === "paints-coatings-adhesives-web-theme";
  const isMaterialBridgeTheme = resolved.storefrontKey === "chemicals-specialty-materials-web-theme";

  if (isCoatCraftTheme) {
    const catalogCoverage = [
      ["Decorative finishes", "Interior paint systems for planned spaces and repeat requirements."],
      ["Protective coatings", "Industrial options organised around surface and exposure needs."],
      ["Wood finishes", "Finishing systems for timber surfaces and application requirements."],
      ["Adhesives & sealants", "Bonding and sealing products for construction and trade use."],
    ];
    const sourcingPrinciples = [
      ["Start with the application", "Surface, exposure and finish requirements come before the product shortlist."],
      ["Compare practical details", "Product information, pack size and quantities stay visible while you evaluate."],
      ["Plan the complete order", "The catalogue, wishlist and buying desk work together for everyday and larger needs."],
    ];
    const journey = [
      ["Discover", "Browse by product family or search by surface and application."],
      ["Compare", "Review the information that matters for suitability and purchasing."],
      ["Plan", "Shortlist products and prepare pack, quantity and delivery details."],
      ["Order", "Continue through checkout or involve the buying desk for a larger requirement."],
    ];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="overflow-hidden bg-[#f3f8fa] text-[#08283d]" data-about-variant="coatcraft-editorial">
          <section className="border-b border-[#bfd9e3] bg-white">
            <div className="mx-auto grid max-w-[1480px] lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,.92fr)]">
              <div className="px-6 py-14 sm:px-10 sm:py-16 lg:px-16 lg:py-20 xl:px-20 xl:py-24">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#0879ad]">{t(`About ${storeName}`)}</p>
                <h1 className="mt-5 max-w-[760px] text-4xl font-black leading-[1.05] tracking-[-0.045em] sm:text-5xl lg:text-[58px]">
                  {t("A clearer way to specify, compare and source coating systems.")}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                  {storeName} {t("brings product discovery, practical buying information and trade support into one focused catalogue for professional coatings and adhesives.")}
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link href="/category" className="inline-flex min-h-12 items-center gap-5 bg-[#0879ad] px-6 py-3 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#05648f]">
                    {t("Explore the catalogue")} <span aria-hidden="true">→</span>
                  </Link>
                  <Link href="/buying-guide" className="inline-flex min-h-12 items-center gap-5 border border-[#9fc4d2] px-6 py-3 text-xs font-black uppercase tracking-[0.1em] text-[#062f45] transition hover:border-[#0879ad] hover:bg-[#edf7fa]">
                    {t("View buying guide")} <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </div>

              <aside className="relative overflow-hidden bg-[#dceef4] px-6 py-12 sm:px-10 lg:px-12 lg:py-16 xl:px-16 xl:py-20" aria-label={t("Catalogue coverage")}>
                <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full border-[56px] border-white/35" aria-hidden="true" />
                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("Catalogue coverage")}</p>
                  <h2 className="mt-3 max-w-md text-2xl font-black leading-tight tracking-[-0.03em] sm:text-3xl">{t("Four material systems. One practical sourcing experience.")}</h2>
                  <div className="mt-8 divide-y divide-[#aacdd9] border-y border-[#aacdd9]">
                    {catalogCoverage.map(([title, description], index) => (
                      <div key={title} className="grid grid-cols-[38px_1fr] gap-4 py-4">
                        <span className="pt-1 text-[10px] font-black tracking-[0.12em] text-[#0879ad]">0{index + 1}</span>
                        <div><h3 className="text-sm font-black">{t(title)}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{t(description)}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="mx-auto max-w-[1320px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[350px_minmax(0,1fr)] lg:gap-16">
              <header>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0879ad]">{t("Our approach")}</p>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-4xl">{t("Built around the decisions professional buyers actually make.")}</h2>
                <p className="mt-5 leading-7 text-slate-600">{t("The experience is organised to keep technical context and commercial planning connected from the first search onward.")}</p>
              </header>
              <div className="border-t border-[#b9d5df]">
                {sourcingPrinciples.map(([title, description], index) => (
                  <article key={title} className="grid gap-4 border-b border-[#b9d5df] py-7 sm:grid-cols-[68px_220px_1fr] sm:items-start">
                    <span className="text-[11px] font-black tracking-[0.16em] text-[#0879ad]">0{index + 1}</span>
                    <h3 className="text-lg font-black tracking-[-0.02em]">{t(title)}</h3>
                    <p className="text-sm leading-7 text-slate-600">{t(description)}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-[#062f45] text-white">
            <div className="mx-auto max-w-[1320px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
              <div className="grid gap-8 border-b border-white/15 pb-9 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
                <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6ec0e5]">{t("The buying journey")}</p><h2 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-4xl">{t("From requirement to order, without losing the details.")}</h2></div>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{t("Each stage gives the buyer a clear next action while keeping product suitability, quantity and delivery planning in view.")}</p>
              </div>
              <ol className="grid border-b border-white/15 md:grid-cols-2 xl:grid-cols-4">
                {journey.map(([title, description], index) => (
                  <li key={title} className="border-white/15 py-7 md:border-r md:px-6 md:first:pl-0 xl:last:border-r-0">
                    <div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[0.16em] text-[#6ec0e5]">STEP 0{index + 1}</span><span className="text-[#6ec0e5]" aria-hidden="true">→</span></div>
                    <h3 className="mt-5 text-xl font-black">{t(title)}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{t(description)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="mx-auto max-w-[1320px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
            <div className="grid gap-8 bg-white p-7 shadow-[0_24px_70px_rgba(6,47,69,0.09)] sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
              <div className="max-w-3xl">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("Plan with confidence")}</p>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] sm:text-3xl">{t("Start with the catalogue. Bring in the trade desk when the requirement gets more complex.")}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t("Use the same product context to compare options, prepare quantities and explain what your business needs.")}</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link href="/category" className="inline-flex min-h-12 items-center bg-[#0879ad] px-6 py-3 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#05648f]">{t("Browse products")}</Link>
                <Link href="/contact" className="inline-flex min-h-12 items-center border border-[#9fc4d2] px-6 py-3 text-xs font-black uppercase tracking-[0.1em] text-[#062f45] transition hover:border-[#0879ad]">{t("Contact trade desk")}</Link>
              </div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isMaterialBridgeTheme) {
    const intelligenceLayers = [
      ["01", "Material identity", "Family, application and material code stay attached to the buying record."],
      ["02", "Pack architecture", "The selected format and the quantity context remain visible while buyers compare."],
      ["03", "Commercial reference", "Sample pricing and volume planning sit beside the material information."],
      ["04", "Release pathway", "A shortlist can move into checkout or a larger sourcing request without losing context."],
    ];
    const operatingRoute = [
      ["Requirement", "Start with the material family, application and pack need."],
      ["Shortlist", "Compare focused records instead of scanning an unstructured catalogue."],
      ["Plan", "Set quantities and review the commercial reference for each item."],
      ["Release", "Continue to checkout or involve the buying desk for a larger requirement."],
    ];
    const buyerPrinciples = [
      ["Specific before broad", "A focused material record is more useful than a page of disconnected product claims."],
      ["Context beside cost", "Pack, quantity and commercial information should be reviewed in the same workflow."],
      ["One clear next step", "Every page should help the buyer move from discovery toward a confirmed requirement."],
    ];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="overflow-hidden bg-[#e8f1ec] text-[#0b2926]" data-about-variant="materialbridge-charter">
          <section
            className="border-b border-[#86ae99]"
            style={{
              backgroundImage: "linear-gradient(rgba(17,105,68,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(17,105,68,.05) 1px,transparent 1px)",
              backgroundSize: "52px 52px",
            }}
          >
            <div className="mx-auto grid max-w-[1440px] border-x border-[#a9c6b7] bg-[#f8fbf9]/95 lg:grid-cols-[minmax(0,1.15fr)_minmax(390px,.85fr)]">
              <div className="relative px-6 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20 xl:px-20 xl:py-24">
                <span className="absolute left-0 top-16 h-24 w-2 bg-[#14843f]" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#14843f]">
                  <span>{t("Company dossier")}</span>
                  <span className="h-px w-12 bg-[#86ae99]" aria-hidden="true" />
                  <span>{t("Material desk / MB-16")}</span>
                </div>
                <h1 className="mt-7 max-w-[780px] text-4xl font-black leading-[.98] tracking-[-0.05em] sm:text-5xl lg:text-[58px]">
                  {t("The infrastructure behind clearer material sourcing.")}
                </h1>
                <p className="mt-7 max-w-2xl text-base leading-8 text-[#536d65] sm:text-lg">
                  {storeName} {t("organises chemical and specialty-material buying around the information a professional buyer needs to identify, compare and release an order.")}
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link href="/category" className="inline-flex min-h-13 items-center bg-[#14843f] px-6 py-4 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#0d6c32]">
                    {t("Open material index")} <span className="ml-5" aria-hidden="true">&#8594;</span>
                  </Link>
                  <Link href="/buying-guide" className="inline-flex min-h-13 items-center border border-[#86ae99] bg-white px-6 py-4 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#0b4b32] transition hover:bg-[#edf5f1]">
                    {t("Read the buying method")}
                  </Link>
                </div>
              </div>

              <aside className="relative min-h-[480px] overflow-hidden border-t border-[#a9c6b7] bg-[#0b4b32] p-7 text-white lg:min-h-0 lg:border-l lg:border-t-0 sm:p-10 lg:p-12">
                <div className="absolute -right-24 -top-24 h-[430px] w-[430px] rounded-full border border-[#64a27e]/45" aria-hidden="true" />
                <div className="absolute -right-4 -top-4 h-[270px] w-[270px] rounded-full border border-[#64a27e]/50" aria-hidden="true" />
                <div className="absolute right-[72px] top-[72px] flex h-28 w-28 items-center justify-center rounded-full border border-[#9ac6ad]/60 text-3xl font-black" aria-hidden="true">MB</div>
                <div className="relative flex h-full flex-col justify-end">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ed0b4]">{t("Procurement charter")}</p>
                  <h2 className="mt-4 max-w-md text-3xl font-black leading-tight tracking-[-0.035em] sm:text-4xl">
                    {t("Material context should travel with every buying decision.")}
                  </h2>
                  <div className="mt-8 grid grid-cols-2 border border-white/20">
                    <div className="border-b border-r border-white/20 p-4"><span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#9ed0b4]">{t("Focus")}</span><strong className="mt-2 block text-xs">{t("Trade materials")}</strong></div>
                    <div className="border-b border-white/20 p-4"><span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#9ed0b4]">{t("Method")}</span><strong className="mt-2 block text-xs">{t("Record-led sourcing")}</strong></div>
                    <div className="border-r border-white/20 p-4"><span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#9ed0b4]">{t("Buyer")}</span><strong className="mt-2 block text-xs">{t("Professional teams")}</strong></div>
                    <div className="p-4"><span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#9ed0b4]">{t("Route")}</span><strong className="mt-2 block text-xs">{t("Sample to volume")}</strong></div>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="bg-white">
            <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
              <div className="grid gap-12 lg:grid-cols-[390px_minmax(0,1fr)] lg:gap-20">
                <header className="lg:sticky lg:top-8 lg:self-start">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#14843f]">{t("The material intelligence stack")}</p>
                  <h2 className="mt-5 text-3xl font-black leading-[1.05] tracking-[-0.04em] sm:text-4xl">
                    {t("Four layers keep a sourcing decision usable.")}
                  </h2>
                  <p className="mt-5 text-sm leading-7 text-[#5e7770]">
                    {t("The catalogue is structured as a working buying record: identity first, then pack, quantity and release information.")}
                  </p>
                </header>

                <div className="border-t border-[#a9c6b7]">
                  {intelligenceLayers.map(([number, title, description]) => (
                    <article key={number} className="grid gap-4 border-b border-[#a9c6b7] py-7 sm:grid-cols-[64px_220px_minmax(0,1fr)] sm:items-start">
                      <span className="flex h-11 w-11 items-center justify-center border border-[#86ae99] bg-[#edf5f1] font-mono text-[10px] font-black text-[#14843f]">{number}</span>
                      <h3 className="text-lg font-black tracking-[-0.025em]">{t(title)}</h3>
                      <p className="text-sm leading-7 text-[#5e7770]">{t(description)}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#0a3429] text-white">
            <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
              <div className="grid gap-8 border-b border-[#477361] pb-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#9ed0b4]">{t("Operating route")}</p>
                  <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{t("From requirement to release.")}</h2>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-[#c2d8cd] sm:text-base">
                  {t("A clear sequence keeps the material, pack and commercial requirement connected while the buyer moves forward.")}
                </p>
              </div>

              <ol className="relative mt-10 grid gap-0 border-x border-[#477361] md:grid-cols-2 xl:grid-cols-4">
                <span className="absolute left-0 right-0 top-[47px] hidden h-px bg-[#477361] xl:block" aria-hidden="true" />
                {operatingRoute.map(([title, description], index) => (
                  <li key={title} className="relative border-b border-[#477361] p-6 md:border-r xl:border-b-0 xl:p-7">
                    <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[#9ed0b4] bg-[#0a3429] font-mono text-[10px] font-black text-[#9ed0b4]">0{index + 1}</div>
                    <h3 className="mt-7 text-xl font-black">{t(title)}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#b8d0c4]">{t(description)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="border-b border-[#a9c6b7]">
            <div className="mx-auto grid max-w-[1400px] border-x border-[#a9c6b7] bg-[#f8fbf9] lg:grid-cols-[.78fr_1.22fr]">
              <div className="border-b border-[#a9c6b7] p-7 sm:p-10 lg:border-b-0 lg:border-r lg:p-14">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#14843f]">{t("Buyer operating principles")}</p>
                <p className="mt-6 text-3xl font-black leading-[1.15] tracking-[-0.04em] sm:text-4xl">
                  {t("A useful catalogue does more than display a pack shot.")}
                </p>
                <p className="mt-5 text-sm leading-7 text-[#5e7770]">
                  {t("It gives the buyer enough structure to compare materials, plan quantities and explain the requirement to another person.")}
                </p>
              </div>
              <div className="divide-y divide-[#a9c6b7]">
                {buyerPrinciples.map(([title, description], index) => (
                  <article key={title} className="grid gap-4 p-7 sm:grid-cols-[54px_200px_minmax(0,1fr)] sm:p-8">
                    <span className="font-mono text-[10px] font-black text-[#14843f]">P-{index + 1}</span>
                    <h3 className="text-base font-black">{t(title)}</h3>
                    <p className="text-sm leading-7 text-[#5e7770]">{t(description)}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="px-5 py-16 sm:px-8 lg:py-24">
            <div className="mx-auto max-w-[1240px] border border-[#86ae99] bg-white shadow-[12px_12px_0_rgba(20,91,61,.11)]">
              <div className="grid lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="p-7 sm:p-10 lg:p-12">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#14843f]">{t("Start a material record")}</p>
                  <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">
                    {t("Begin with the index. Bring in the sourcing desk when the requirement grows.")}
                  </h2>
                </div>
                <div className="grid border-t border-[#a9c6b7] sm:grid-cols-2 lg:border-l lg:border-t-0">
                  <Link href="/category" className="flex min-h-20 items-center justify-between bg-[#14843f] px-7 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#0d6c32]">
                    {t("Browse materials")} <span className="ml-8" aria-hidden="true">&#8594;</span>
                  </Link>
                  <Link href="/contact" className="flex min-h-20 items-center justify-between border-t border-[#a9c6b7] px-7 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#0b4b32] transition hover:bg-[#edf5f1] sm:border-l sm:border-t-0">
                    {t("Contact the desk")} <span className="ml-8" aria-hidden="true">&#8599;</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  const fallback = (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <main className="storefront-about-page overflow-hidden bg-[#f4f7f6] text-slate-950">
        <section className="relative overflow-hidden bg-[#061016] text-white">
          <div className="pointer-events-none absolute -right-24 -top-40 h-[34rem] w-[34rem] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-28 right-0 h-48 w-[48%] -skew-y-6 bg-[var(--theme-primary)] opacity-90" />
          <div className="relative mx-auto grid max-w-[1260px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:px-10 lg:py-28">
            <div className="max-w-3xl">
              <p className="font-mono text-[11px] font-black uppercase tracking-[0.24em] text-[var(--theme-secondary)]">
                {t(`About ${storeName}`)}
              </p>
              <h1 className="mt-6 text-4xl font-black leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                {t("A more dependable way to source for business.")}
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                {storeName} {t(`brings ${industryName.toLowerCase()} products, practical buying tools and responsive trade support together in one streamlined experience.`)}
              </p>
            </div>

            <aside className="self-end border border-white/15 bg-white/[0.06] p-7 backdrop-blur-sm sm:p-9">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--theme-secondary)]">
                {t("Our purpose")}
              </p>
              <p className="mt-5 text-2xl font-bold leading-snug tracking-[-0.025em]">
                {t("Make professional sourcing clear, efficient and ready to scale with your business.")}
              </p>
              <div className="mt-8 h-1 w-20 bg-[var(--theme-primary)]" />
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-[1260px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="grid gap-8 border-b border-slate-200 pb-12 lg:grid-cols-[.72fr_1.28fr] lg:pb-16">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[var(--theme-primary)]">
                {t("What sets us apart")}
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-4xl">
                {t("Built around real business buying needs.")}
              </h2>
            </div>
            <p className="max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              {t("We focus on useful product information, organised discovery and straightforward ordering. Whether you are replenishing everyday stock or planning a larger requirement, our goal is to help you move from shortlist to order with confidence.")}
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 lg:grid-cols-3">
            {strengths.map((item) => (
              <article key={item.number} className="bg-white p-7 sm:p-9">
                <span className="inline-flex h-10 w-10 items-center justify-center bg-[var(--theme-primary)] font-mono text-[11px] font-black text-white">
                  {item.number}
                </span>
                <h3 className="mt-7 text-xl font-black tracking-[-0.025em]">{t(item.title)}</h3>
                <p className="mt-3 leading-7 text-slate-600">{t(item.description)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-[1260px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-10 lg:py-24">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[var(--theme-primary)]">
                {t("How it works")}
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-4xl">
                {t("From product search to business supply.")}
              </h2>
              <p className="mt-5 max-w-lg leading-7 text-slate-600">
                {t("A simple, transparent process designed to save time without compromising purchasing decisions.")}
              </p>
            </div>

            <ol className="divide-y divide-slate-200 border-y border-slate-200">
              {steps.map(([title, description], index) => (
                <li key={title} className="grid gap-4 py-7 sm:grid-cols-[54px_150px_1fr] sm:items-start">
                  <span className="font-mono text-xs font-black text-[var(--theme-primary)]">0{index + 1}</span>
                  <h3 className="text-lg font-black">{t(title)}</h3>
                  <p className="leading-7 text-slate-600">{t(description)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-[1260px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="relative overflow-hidden bg-[#061016] px-7 py-12 text-white sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-16 lg:py-16">
            <div className="absolute bottom-0 right-0 h-full w-40 bg-[var(--theme-primary)] opacity-20 [clip-path:polygon(55%_0,100%_0,100%_100%,0_100%)]" />
            <div className="relative max-w-2xl">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[var(--theme-secondary)]">
                {t("Ready to source?")}
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-4xl">
                {t("Start with the catalogue or speak with our team.")}
              </h2>
            </div>
            <div className="relative mt-8 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
              <Link href="/category" className="bg-[var(--theme-primary)] px-6 py-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:brightness-110">
                {t("Explore products")}
              </Link>
              <Link href="/contact" className="border border-white/30 px-6 py-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-white hover:bg-white/10">
                {t("Contact trade desk")}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </StorefrontLocaleFrame>
  );

  return <ThemedContentPage page="about" fallback={fallback} />;
}
