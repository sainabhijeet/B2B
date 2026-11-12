import type { Metadata } from "next";
import Link from "next/link";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import ThemedContentPage from "@/components/ThemedContentPage";
import { directoryUrlFromManifestPath } from "@/engine/manifest-url";
import { backendOriginFromApiUrl } from "@/lib/api-origin";
import { resolveStorefrontTheme, storefrontDisplayName } from "@/lib/resolve-storefront-theme";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";

export const metadata: Metadata = {
  title: "Blog",
  description: "Practical guides for product discovery, coating-system comparison and business order planning.",
};

const genericPosts = [
  ["Buying Guide", "How to compare products for a confident business purchase"],
  ["Order Planning", "The details to prepare before requesting a bulk quote"],
  ["Buyer Support", "A practical checklist for delivery, returns and order tracking"],
];

export default async function BlogPage() {
  const [language, resolved] = await Promise.all([getStorefrontLanguage(), resolveStorefrontTheme()]);
  const t = (text: string) => translate(text, language);
  const storeName = storefrontDisplayName(resolved);
  const isCoatCraftTheme = resolved.storefrontKey === "paints-coatings-adhesives-web-theme";
  const isMaterialBridgeTheme = resolved.storefrontKey === "chemicals-specialty-materials-web-theme";

  if (isCoatCraftTheme) {
    const assetDirectory = directoryUrlFromManifestPath(resolved.webTheme?.manifestPath ?? "");
    const assetBase = /^https?:\/\//iu.test(assetDirectory)
      ? assetDirectory
      : `${backendOriginFromApiUrl()}${assetDirectory.startsWith("/") ? "" : "/"}${assetDirectory}`;
    const imageUrl = (file: string) => `${assetBase}assets/images/${file}`;
    const articles = [
      {
        label: "Product comparison",
        title: "Compare coating systems around the surface—not just the product name",
        summary: "Use application, exposure and finish requirements to build a more relevant shortlist.",
        href: "/buying-guide",
        image: imageUrl("product-03.jpg"),
        alt: "AI-generated demo product photograph of a wood-finish coating can",
      },
      {
        label: "Order planning",
        title: "Prepare quantities and delivery details before requesting a quote",
        summary: "A structured requirement helps the buying desk review a larger or multi-product order.",
        href: "/bulk-orders",
        image: imageUrl("product-06.jpg"),
        alt: "AI-generated demo photograph of professional coating supplies",
      },
      {
        label: "Adhesives & sealants",
        title: "Keep application method and pack requirements in the same decision",
        summary: "Compare the practical buying details that sit alongside product suitability.",
        href: "/category",
        image: imageUrl("product-04.jpg"),
        alt: "AI-generated demo product photograph of an adhesive cartridge",
      },
    ];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="overflow-hidden bg-[#f4f8fa] text-[#08283d]" data-blog-variant="coatcraft-magazine">
          <section className="bg-white">
            <div className="mx-auto max-w-[1320px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
              <div className="grid gap-5 border-b border-[#bad4de] pb-8 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0879ad]">{t(`${storeName} journal`)}</p>
                  <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{t("Trade notes")}</h1>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{t("Practical guidance for product comparison, order preparation and professional coating-system sourcing.")}</p>
              </div>

              <article className="mt-8 grid overflow-hidden border border-[#bad4de] bg-[#edf5f8] lg:grid-cols-[1.18fr_.82fr]">
                <div className="relative min-h-[320px] overflow-hidden sm:min-h-[420px] lg:min-h-[500px]">
                  <img src={imageUrl("hero-coating-specification-v2.jpg")} alt="AI-generated demo photograph of a professional paint container" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute bottom-4 left-4 bg-white/95 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600">{t("Demo catalogue imagery")}</span>
                </div>
                <div className="flex flex-col justify-center px-6 py-9 sm:px-9 lg:px-12">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("Featured buying note")}</p>
                  <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-4xl">{t("Begin with the substrate and exposure conditions.")}</h2>
                  <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">{t("Then compare finish, pack size, minimum order and application method. The buying guide turns those decisions into a clear sourcing path.")}</p>
                  <Link href="/buying-guide" className="mt-8 inline-flex w-fit items-center gap-6 border-b-2 border-[#0879ad] pb-2 text-xs font-black uppercase tracking-[0.1em] text-[#062f45] transition hover:text-[#0879ad]">
                    {t("Read the buying guide")} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            </div>
          </section>

          <section className="mx-auto max-w-[1320px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
            <header className="flex flex-col gap-4 border-b border-[#bad4de] pb-7 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("Latest guides")}</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">{t("Plan the next decision")}</h2></div>
              <p className="max-w-xl text-sm leading-6 text-slate-600">{t("Short, useful routes into the catalogue and buying-support journey.")}</p>
            </header>

            <div className="mt-8 grid gap-7 lg:grid-cols-3">
              {articles.map((article) => (
                <article key={article.title} className="group flex flex-col bg-white shadow-[0_16px_45px_rgba(6,47,69,0.08)]">
                  <Link href={article.href} className="block overflow-hidden bg-[#dbe8ed]">
                    <img src={article.image} alt={article.alt} className="h-60 w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
                  </Link>
                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#0879ad]">{t(article.label)}</p>
                    <h3 className="mt-4 text-xl font-black leading-snug tracking-[-0.025em]">{t(article.title)}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{t(article.summary)}</p>
                    <Link href={article.href} className="mt-7 flex items-center justify-between border-t border-[#d4e2e7] pt-5 text-xs font-black uppercase tracking-[0.08em] text-[#0879ad]">
                      {t("Read guide")} <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="bg-[#062f45] text-white">
            <div className="mx-auto grid max-w-[1320px] gap-7 px-5 py-11 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6ec0e5]">{t("Need help with a requirement?")}</p><h2 className="mt-3 text-2xl font-black tracking-[-0.03em] sm:text-3xl">{t("Share the product, quantity and delivery details with the trade desk.")}</h2></div>
              <div className="flex flex-wrap gap-3">
                <Link href="/category" className="inline-flex min-h-12 items-center bg-[#0879ad] px-6 py-3 text-xs font-black uppercase tracking-[0.09em] text-white transition hover:bg-[#1193ca]">{t("Browse catalogue")}</Link>
                <Link href="/contact" className="inline-flex min-h-12 items-center border border-white/35 px-6 py-3 text-xs font-black uppercase tracking-[0.09em] text-white transition hover:border-white">{t("Contact support")}</Link>
              </div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isMaterialBridgeTheme) {
    const fieldNotes = [
      {
        code: "MBN-01",
        tag: "Grade & application",
        title: "Build the shortlist around the intended material use",
        summary: "A clear application context helps buyers compare a focused set of materials instead of relying on product names alone.",
        href: "/buying-guide",
        read: "04 min",
      },
      {
        code: "MBN-02",
        tag: "Pack & volume",
        title: "Keep pack format visible while planning quantity",
        summary: "The selected pack, required units and volume assumptions should remain connected through the buying workflow.",
        href: "/category",
        read: "03 min",
      },
      {
        code: "MBN-03",
        tag: "Bulk sourcing",
        title: "Prepare a requirement the buying desk can review",
        summary: "Product references, quantities, destination and preferred timing create a more useful starting point for a larger enquiry.",
        href: "/bulk-orders",
        read: "05 min",
      },
      {
        code: "MBN-04",
        tag: "Delivery control",
        title: "Separate availability from confirmed delivery timing",
        summary: "Use checkout and order tracking for the most relevant dispatch information once a material order is confirmed.",
        href: "/shipping",
        read: "04 min",
      },
    ];
    const decisionIndex = [
      ["01", "Identify", "Material family and application"],
      ["02", "Compare", "Grade, pack and quantity"],
      ["03", "Plan", "Commercial and delivery context"],
      ["04", "Release", "Checkout or sourcing request"],
    ];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="overflow-hidden bg-[#e8f1ec] text-[#0b2926]" data-blog-variant="materialbridge-bulletin">
          <section
            className="border-b border-[#8eb7a3]"
            style={{
              backgroundImage: "linear-gradient(rgba(17,105,68,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(17,105,68,.05) 1px,transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          >
            <div className="mx-auto grid max-w-[1440px] border-x border-[#a9c6b7] bg-[#f9fbfa]/95 lg:grid-cols-[minmax(0,1.22fr)_360px]">
              <div className="px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20 xl:px-20">
                <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#14843f]">
                  <span>{t("Material intelligence bulletin")}</span>
                  <span className="h-px w-14 bg-[#8eb7a3]" aria-hidden="true" />
                  <span>{t("Issue register / 016")}</span>
                </div>
                <h1 className="mt-6 max-w-[860px] text-4xl font-black leading-[.98] tracking-[-0.05em] sm:text-5xl lg:text-[58px]">
                  {t("Field notes for better material buying decisions.")}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-[#536d65] sm:text-lg">
                  {t("Short working notes on material comparison, pack planning, volume requirements and the path from shortlist to release.")}
                </p>
              </div>

              <aside className="grid border-t border-[#a9c6b7] bg-[#0b4b32] text-white lg:border-l lg:border-t-0">
                <div className="relative overflow-hidden border-b border-white/20 p-7 sm:p-9">
                  <span className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-[#7db594]/50" aria-hidden="true" />
                  <span className="absolute right-4 top-4 h-20 w-20 rounded-full border border-[#7db594]/50" aria-hidden="true" />
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#9ed0b4]">{t("Current desk")}</p>
                  <strong className="mt-3 block text-xl">{storeName}</strong>
                  <p className="mt-2 text-xs leading-5 text-[#c1d8cc]">{t("Chemicals & specialty materials")}</p>
                </div>
                <div className="grid grid-cols-2">
                  <div className="border-r border-white/20 p-6"><span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#9ed0b4]">{t("Notes")}</span><strong className="mt-2 block text-3xl">04</strong></div>
                  <div className="p-6"><span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#9ed0b4]">{t("Focus")}</span><strong className="mt-3 block text-xs">{t("Buyer decisions")}</strong></div>
                </div>
              </aside>
            </div>
          </section>

          <section className="mx-auto max-w-[1340px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
            <article className="grid border border-[#8eb7a3] bg-white shadow-[12px_12px_0_rgba(20,91,61,.10)] lg:grid-cols-[minmax(0,1.1fr)_minmax(390px,.9fr)]">
              <div className="p-7 sm:p-10 lg:p-14">
                <div className="flex flex-wrap items-center gap-4 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[#14843f]">
                  <span>{t("Lead dispatch")}</span>
                  <span className="border border-[#8eb7a3] bg-[#edf5f1] px-3 py-2 text-[#0b4b32]">MB-FN / 001</span>
                </div>
                <h2 className="mt-6 max-w-3xl text-3xl font-black leading-[1.04] tracking-[-0.045em] sm:text-4xl lg:text-[46px]">
                  {t("Why pack format belongs in the first material conversation.")}
                </h2>
                <p className="mt-6 max-w-2xl text-sm leading-7 text-[#5e7770] sm:text-base">
                  {t("A material may look suitable on paper, but pack size and the required order volume can change the buying decision. Compare them together from the beginning.")}
                </p>
                <Link href="/buying-guide" className="mt-8 inline-flex min-h-12 items-center bg-[#14843f] px-6 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#0d6c32]">
                  {t("Open the buying method")} <span className="ml-6" aria-hidden="true">&#8594;</span>
                </Link>
              </div>

              <div className="relative min-h-[420px] overflow-hidden border-t border-[#8eb7a3] bg-[#dcebe3] lg:border-l lg:border-t-0">
                <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#78aa8d]" aria-hidden="true" />
                <div className="absolute left-1/2 top-1/2 h-[205px] w-[205px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#78aa8d]" aria-hidden="true" />
                <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#0b4b32] text-2xl font-black text-white">MB</div>
                <span className="absolute left-[18%] top-[22%] h-4 w-4 rounded-full bg-[#14843f] ring-8 ring-white/75" aria-hidden="true" />
                <span className="absolute bottom-[20%] right-[17%] h-4 w-4 rounded-full bg-[#14843f] ring-8 ring-white/75" aria-hidden="true" />
                <div className="absolute bottom-5 left-5 right-5 grid grid-cols-2 border border-[#8eb7a3] bg-white/95">
                  <div className="border-r border-[#b8d0c4] p-4"><span className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#6b817a]">{t("Input")}</span><strong className="mt-2 block text-xs">{t("Material need")}</strong></div>
                  <div className="p-4"><span className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#6b817a]">{t("Output")}</span><strong className="mt-2 block text-xs">{t("Order-ready context")}</strong></div>
                </div>
              </div>
            </article>
          </section>

          <section className="border-y border-[#8eb7a3] bg-white">
            <div className="mx-auto max-w-[1340px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
              <header className="grid gap-6 border-b border-[#8eb7a3] pb-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#14843f]">{t("Field-note register")}</p>
                  <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{t("Read by buying decision.")}</h2>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-[#5e7770]">{t("Each note connects a practical question to the next useful part of the sourcing workflow.")}</p>
              </header>

              <div>
                {fieldNotes.map((note, index) => (
                  <article key={note.code} className="group grid gap-5 border-b border-[#b8d0c4] py-7 lg:grid-cols-[92px_170px_minmax(0,1fr)_90px_42px] lg:items-start">
                    <span className="font-mono text-[10px] font-black text-[#14843f]">{note.code}</span>
                    <div>
                      <span className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#6b817a]">{t(note.tag)}</span>
                      <span className="mt-2 block text-[10px] text-[#86a095]">{String(index + 1).padStart(2, "0")} / 04</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black leading-tight tracking-[-0.025em] transition group-hover:text-[#14843f]">{t(note.title)}</h3>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5e7770]">{t(note.summary)}</p>
                    </div>
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#6b817a]">{note.read}</span>
                    <Link href={note.href} className="flex h-10 w-10 items-center justify-center border border-[#8eb7a3] text-[#14843f] transition group-hover:bg-[#14843f] group-hover:text-white" aria-label={t(`Read ${note.title}`)}>
                      <span aria-hidden="true">&#8594;</span>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-[#0a3429] text-white">
            <div className="mx-auto max-w-[1340px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
              <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#9ed0b4]">{t("Decision index")}</p>
                  <h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">{t("Four stages. One material record.")}</h2>
                </div>
                <div className="grid border border-[#477361] sm:grid-cols-2 xl:grid-cols-4">
                  {decisionIndex.map(([number, title, description], index) => (
                    <div key={number} className={`p-5 ${index < 3 ? "border-b border-[#477361] sm:border-r xl:border-b-0" : ""}`}>
                      <span className="font-mono text-[9px] font-black text-[#9ed0b4]">{number}</span>
                      <strong className="mt-4 block text-base">{t(title)}</strong>
                      <p className="mt-2 text-xs leading-5 text-[#b8d0c4]">{t(description)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="px-5 py-14 sm:px-8 lg:py-20">
            <div className="mx-auto grid max-w-[1180px] border border-[#8eb7a3] bg-[#f9fbfa] shadow-[10px_10px_0_rgba(20,91,61,.10)] lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="p-7 sm:p-10">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#14843f]">{t("Need a material answer?")}</p>
                <h2 className="mt-3 max-w-2xl text-2xl font-black tracking-[-0.035em] sm:text-3xl">{t("Take the requirement to the sourcing desk.")}</h2>
              </div>
              <div className="flex border-t border-[#8eb7a3] lg:border-l lg:border-t-0">
                <Link href="/contact" className="flex min-h-20 flex-1 items-center justify-between bg-[#14843f] px-7 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#0d6c32] lg:min-w-[260px]">
                  {t("Contact the desk")} <span className="ml-6" aria-hidden="true">&#8594;</span>
                </Link>
              </div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  const fallback = (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <main className="min-h-screen bg-[#f5f6f4] px-5 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="border-b border-slate-200 pb-9">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--theme-primary)]">{t("Knowledge centre")}</p>
            <h1 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">{t("Buying notes and practical guides")}</h1>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {genericPosts.map(([tag, title]) => <article key={title} className="border border-slate-200 bg-white p-7"><span className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--theme-primary)]">{t(tag)}</span><h2 className="mt-4 text-xl font-black text-slate-950">{t(title)}</h2></article>)}
          </div>
        </div>
      </main>
    </StorefrontLocaleFrame>
  );

  return <ThemedContentPage page="blog" fallback={fallback} />;
}
