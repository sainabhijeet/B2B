import Link from "next/link";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { resolveStorefrontTheme, storefrontDisplayName } from "@/lib/resolve-storefront-theme";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";

type InformationSection = {
  title: string;
  description: string;
  items?: string[];
};

type Highlight = {
  label: string;
  value: string;
};

type Props = {
  pageVariant?: string;
  eyebrow: string;
  title: string;
  introduction: string;
  highlights?: Highlight[];
  sections: InformationSection[];
  notice?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
};

export default async function StorefrontInformationPage({
  pageVariant,
  eyebrow,
  title,
  introduction,
  highlights = [],
  sections,
  notice,
  primaryAction = { label: "Browse products", href: "/category" },
  secondaryAction = { label: "Contact support", href: "/contact" },
}: Props) {
  const [language, resolved] = await Promise.all([
    getStorefrontLanguage(),
    resolveStorefrontTheme(),
  ]);
  const t = (text: string) => translate(text, language);
  const storeName = storefrontDisplayName(resolved);
  const isCoatCraftTheme = resolved.storefrontKey === "paints-coatings-adhesives-web-theme";
  const isMaterialBridgeTheme = resolved.storefrontKey === "chemicals-specialty-materials-web-theme";

  if (isMaterialBridgeTheme && pageVariant === "offers") {
    const highlightCodes = ["PRICE", "MOQ", "STOCK", "TOTAL"];
    const sectionCodes = ["PRICING", "VOLUME", "TERMS", "RFQ"];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="material-offers-page" data-information-variant="material-offers-ledger">
          <section className="material-offers-hero">
            <div className="material-offers-hero-shell">
              <div className="material-offers-intro">
                <p>{t("COMMERCIAL TERMS / LIVE OFFER INDEX")}</p>
                <h1>{t(title)}</h1>
                <span>{t(introduction)}</span>
                <div><strong>{t(storeName)}</strong><small>{t("Materials offer desk")}</small></div>
              </div>

              <aside className="material-offers-register" aria-label={t("Offer eligibility register")}>
                <header><span>{t("OFFER ELIGIBILITY REGISTER")}</span><b>{t("LIVE")}</b></header>
                <dl>
                  {highlights.map((highlight, index) => (
                    <div key={highlight.label}>
                      <span>{highlightCodes[index] ?? "TERM"}</span>
                      <dt>{t(highlight.label)}</dt>
                      <dd>{t(highlight.value)}</dd>
                    </div>
                  ))}
                </dl>
                <footer>{t("Final commercial terms remain visible at product or checkout level.")}</footer>
              </aside>
            </div>
          </section>

          {notice ? (
            <section className="material-offers-protocol">
              <div><strong>{t("ELIGIBILITY PROTOCOL")}</strong><p>{t(notice)}</p><span>{t("Verify before order")}</span></div>
            </section>
          ) : null}

          <section className="material-offers-workspace">
            <aside className="material-offers-index">
              <p>{t("OFFER CLASSIFICATION")}</p>
              <h2>{t("Four commercial checks before you commit.")}</h2>
              <span>{t("Read each offer against the material record, required quantity and final checkout total.")}</span>
              <div aria-hidden="true"><i /><i /><i /></div>
            </aside>

            <div className="material-offers-terms">
              {sections.map((section, index) => (
                <article key={section.title}>
                  <header><span>{sectionCodes[index] ?? "TERM"}</span><small>{t("COMMERCIAL RECORD")}</small></header>
                  <div className="material-offers-term-copy">
                    <h3>{t(section.title)}</h3>
                    <p>{t(section.description)}</p>
                  </div>
                  {section.items?.length ? (
                    <ul>{section.items.map((item) => <li key={item}><span aria-hidden="true" />{t(item)}</li>)}</ul>
                  ) : <div />}
                </article>
              ))}
            </div>
          </section>

          <section className="material-offers-actions">
            <div>
              <p>{t("NEXT SOURCING MOVE")}</p>
              <h2>{t("Compare the listed material first. Escalate larger quantities to the RFQ desk.")}</h2>
            </div>
            <div>
              <Link href={primaryAction.href}>{t(primaryAction.label)} <span aria-hidden="true">&#8599;</span></Link>
              <Link href={secondaryAction.href}>{t(secondaryAction.label)} <span aria-hidden="true">&#8594;</span></Link>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isMaterialBridgeTheme && pageVariant === "buying-guide") {
    const stageCodes = ["DISCOVER", "COMPARE", "QUANTITY", "RELEASE"];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="material-guide-page" data-information-variant="material-qualification-path">
          <section className="material-guide-hero">
            <div className="material-guide-hero-shell">
              <div className="material-guide-intro">
                <p>{t("BUYING PROTOCOL / MATERIAL QUALIFICATION")}</p>
                <h1>{t(title)}</h1>
                <span>{t(introduction)}</span>
                <div className="material-guide-hero-actions">
                  <Link href={primaryAction.href}>{t(primaryAction.label)} <span aria-hidden="true">&#8599;</span></Link>
                  <Link href={secondaryAction.href}>{t(secondaryAction.label)} <span aria-hidden="true">&#8594;</span></Link>
                </div>
              </div>

              <aside className="material-guide-compass" aria-label={t("Material qualification compass")}>
                <header><span>{t("QUALIFICATION COMPASS")}</span><small>{t("Four buyer checks")}</small></header>
                <div>
                  {highlights.map((highlight) => (
                    <section key={highlight.label}>
                      <strong>{t(highlight.label)}</strong>
                      <span>{t(highlight.value)}</span>
                    </section>
                  ))}
                </div>
                <b aria-hidden="true">MATCH</b>
                <footer>{t("APPLICATION  →  GRADE  →  PACK / MOQ  →  RELEASE")}</footer>
              </aside>
            </div>
          </section>

          <section className="material-guide-brief">
            <div>
              <p>{t("THE QUALIFICATION ROUTE")}</p>
              <h2>{t("Qualify the material before it reaches the cart.")}</h2>
              <span>{t("Each stage answers a different buying question. Move forward only when the material record supports the requirement.")}</span>
            </div>
            <dl>
              <div><dt>{t("Match")}</dt><dd>{t("Application and material family")}</dd></div>
              <div><dt>{t("Verify")}</dt><dd>{t("Grade, pack, price and stock")}</dd></div>
              <div><dt>{t("Release")}</dt><dd>{t("Quantity, checkout and tracking")}</dd></div>
            </dl>
          </section>

          <section className="material-guide-path">
            {sections.map((section, index) => (
              <article key={section.title}>
                <header><span>{stageCodes[index] ?? "CHECK"}</span><i aria-hidden="true" /></header>
                <div className="material-guide-stage-copy">
                  <small>{t("BUYER DECISION")}</small>
                  <h3>{t(section.title)}</h3>
                  <p>{t(section.description)}</p>
                </div>
                {section.items?.length ? (
                  <ul>{section.items.map((item) => <li key={item}><span aria-hidden="true" />{t(item)}</li>)}</ul>
                ) : <div />}
              </article>
            ))}
          </section>

          <section className="material-guide-actions">
            <div><p>{t("READY TO QUALIFY A MATERIAL?")}</p><h2>{t("Start with the material family. Keep the requirement beside you as you compare.")}</h2></div>
            <div><Link href={primaryAction.href}>{t(primaryAction.label)} <span aria-hidden="true">&#8599;</span></Link><Link href={secondaryAction.href}>{t(secondaryAction.label)} <span aria-hidden="true">&#8594;</span></Link></div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isMaterialBridgeTheme && pageVariant === "bulk-orders") {
    const fieldCodes = ["MAT", "VOL", "SHIP", "TERM"];
    const stageCodes = ["SCOPE", "REVIEW", "PLAN", "RELEASE"];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="material-bulk-page" data-information-variant="volume-sourcing-workbook">
          <section className="material-bulk-hero">
            <div className="material-bulk-hero-shell">
              <div className="material-bulk-intro">
                <p>{t("VOLUME SOURCING / RFQ WORKBOOK")}</p>
                <h1>{t(title)}</h1>
                <span>{t(introduction)}</span>
                <div>
                  <Link href={primaryAction.href}>{t(primaryAction.label)} <span aria-hidden="true">&#8599;</span></Link>
                  <Link href={secondaryAction.href}>{t(secondaryAction.label)} <span aria-hidden="true">&#8594;</span></Link>
                </div>
              </div>

              <aside className="material-bulk-brief" aria-label={t("Volume requirement brief")}>
                <header><span>{t("VOLUME REQUIREMENT BRIEF")}</span><b>RFQ / 01</b></header>
                <dl>
                  {highlights.map((highlight, index) => (
                    <div key={highlight.label}>
                      <span>{fieldCodes[index] ?? "FIELD"}</span>
                      <dt>{t(highlight.label)}</dt>
                      <dd>{t(highlight.value)}</dd>
                    </div>
                  ))}
                </dl>
                <footer><span>{t("DEFINE")}</span><i /><span>{t("CHECK")}</span><i /><span>{t("CONFIRM")}</span></footer>
              </aside>
            </div>
          </section>

          {notice ? <section className="material-bulk-notice"><strong>{t("COMMERCIAL NOTE")}</strong><p>{t(notice)}</p><span>{t("Enquiry only")}</span></section> : null}

          <section className="material-bulk-process">
            <header>
              <div><p>{t("RFQ DEVELOPMENT PATH")}</p><h2>{t("Build a reviewable volume brief, one decision at a time.")}</h2></div>
              <span>{t("Move from product scope to confirmed order terms without losing the technical or delivery context.")}</span>
            </header>

            <div className="material-bulk-workbook">
              {sections.map((section, index) => (
                <article key={section.title}>
                  <aside><span>{String(index + 1).padStart(2, "0")}</span><strong>{stageCodes[index] ?? "CHECK"}</strong></aside>
                  <div className="material-bulk-stage-copy"><small>{t("WORKBOOK SECTION")}</small><h3>{t(section.title)}</h3><p>{t(section.description)}</p></div>
                  {section.items?.length ? <ul>{section.items.map((item) => <li key={item}><span aria-hidden="true" />{t(item)}</li>)}</ul> : <div />}
                </article>
              ))}
            </div>
          </section>

          <section className="material-bulk-actions">
            <div><p>{t("READY TO DEFINE THE VOLUME?")}</p><h2>{t("Select the materials first, then send the complete requirement to the buying desk.")}</h2></div>
            <div><Link href={primaryAction.href}>{t(primaryAction.label)} <span aria-hidden="true">&#8599;</span></Link><Link href={secondaryAction.href}>{t(secondaryAction.label)} <span aria-hidden="true">&#8594;</span></Link></div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isMaterialBridgeTheme && pageVariant === "shipping") {
    const checkpointCodes = ["PREP", "COST", "TRACE", "RECEIVE"];
    const routeCodes = ["AVAIL", "DEST", "TRACK", "HELP"];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="material-shipping-page" data-information-variant="material-dispatch-route">
          <section className="material-shipping-hero">
            <div className="material-shipping-hero-shell">
              <div className="material-shipping-intro">
                <p>{t("MATERIAL MOVEMENT / DELIVERY ROUTE")}</p>
                <h1>{t(title)}</h1>
                <span>{t(introduction)}</span>
                <div><Link href={primaryAction.href}>{t(primaryAction.label)} <span aria-hidden="true">&#8599;</span></Link><Link href={secondaryAction.href}>{t(secondaryAction.label)} <span aria-hidden="true">&#8594;</span></Link></div>
              </div>

              <aside className="material-shipping-board" aria-label={t("Delivery route board")}>
                <header><span>{t("DELIVERY ROUTE BOARD")}</span><b>{t("4 buyer checks")}</b></header>
                <div className="material-shipping-route">
                  {highlights.map((highlight, index) => (
                    <section key={highlight.label}>
                      <div><span>{String(index + 1).padStart(2, "0")}</span><i aria-hidden="true" /></div>
                      <small>{routeCodes[index] ?? "CHECK"}</small>
                      <strong>{t(highlight.label)}</strong>
                      <p>{t(highlight.value)}</p>
                    </section>
                  ))}
                </div>
                <footer>{t("ORIGIN  →  CHECKOUT  →  DISPATCH  →  RECEIVING")}</footer>
              </aside>
            </div>
          </section>

          {notice ? <section className="material-shipping-notice"><strong>{t("DELIVERY VARIABLE")}</strong><p>{t(notice)}</p><span>{t("Verify at checkout")}</span></section> : null}

          <section className="material-shipping-checkpoints">
            <header><div><p>{t("MOVEMENT CHECKPOINTS")}</p><h2>{t("Follow the material from release to receiving.")}</h2></div><span>{t("Each checkpoint records a different delivery decision. Review the order-specific information whenever it becomes available.")}</span></header>
            <div className="material-shipping-manifest">
              {sections.map((section, index) => (
                <article key={section.title}>
                  <aside><span>{String(index + 1).padStart(2, "0")}</span><strong>{checkpointCodes[index] ?? "CHECK"}</strong><i aria-hidden="true" /></aside>
                  <div className="material-shipping-stage-copy"><small>{t("ROUTE CHECKPOINT")}</small><h3>{t(section.title)}</h3><p>{t(section.description)}</p></div>
                  {section.items?.length ? <ul>{section.items.map((item) => <li key={item}><span aria-hidden="true" />{t(item)}</li>)}</ul> : <div />}
                </article>
              ))}
            </div>
          </section>

          <section className="material-shipping-actions">
            <div><p>{t("NEED AN ORDER-SPECIFIC UPDATE?")}</p><h2>{t("Use the order reference to review movement or contact the support desk.")}</h2></div>
            <div><Link href={primaryAction.href}>{t(primaryAction.label)} <span aria-hidden="true">&#8599;</span></Link><Link href={secondaryAction.href}>{t(secondaryAction.label)} <span aria-hidden="true">&#8594;</span></Link></div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isMaterialBridgeTheme && pageVariant === "returns") {
    const reviewCodes = ["ELIGIBLE", "REPORT", "RETURN", "REFUND"];
    const caseFields = [
      ["Start record", "Order reference"],
      ["Preserve", "Product, labels and pack"],
      ["Evidence", "Clear issue photographs"],
      ["Next move", "Await return instructions"],
    ];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="material-returns-page" data-information-variant="material-exception-file">
          <section className="material-returns-hero">
            <div className="material-returns-hero-shell">
              <div className="material-returns-intro">
                <p>{t("ORDER EXCEPTION / RETURN ASSESSMENT")}</p>
                <h1>{t(title)}</h1>
                <span>{t(introduction)}</span>
                <div><Link href={primaryAction.href}>{t(primaryAction.label)} <span aria-hidden="true">&#8599;</span></Link><Link href={secondaryAction.href}>{t(secondaryAction.label)} <span aria-hidden="true">&#8594;</span></Link></div>
              </div>

              <aside className="material-returns-cover" aria-label={t("Return assessment file")}>
                <header><span>{t("EXCEPTION INTAKE FILE")}</span><b>MB / RMA</b></header>
                <div className="material-returns-cover-label"><small>{t("CASE ROUTING")}</small><h2>{t("Return & refund review")}</h2><p>{t("Preserve the order record and product condition before the request is assessed.")}</p></div>
                <dl>{caseFields.map(([label, value], index) => <div key={label}><span>{String(index + 1).padStart(2, "0")}</span><dt>{t(label)}</dt><dd>{t(value)}</dd></div>)}</dl>
                <footer>{t("DO NOT RETURN MATERIAL WITHOUT CONFIRMED INSTRUCTIONS")}</footer>
              </aside>
            </div>
          </section>

          {notice ? <section className="material-returns-notice"><strong>{t("POLICY PRIORITY")}</strong><p>{t(notice)}</p><span>{t("Order terms apply")}</span></section> : null}

          <section className="material-returns-review">
            <header><div><p>{t("ASSESSMENT FILE")}</p><h2>{t("Document the issue before the material moves.")}</h2></div><span>{t("Each stage protects the order record, the product condition and the evidence required for a clear support decision.")}</span></header>
            <div className="material-returns-file">
              <div className="material-returns-file-head"><span>{t("FILE STEP")}</span><span>{t("REVIEW RECORD")}</span><span>{t("SUPPORTING CHECKS")}</span></div>
              {sections.map((section, index) => (
                <article key={section.title}>
                  <aside><span>{String(index + 1).padStart(2, "0")}</span><strong>{reviewCodes[index] ?? "CHECK"}</strong></aside>
                  <div className="material-returns-stage-copy"><small>{t("CASE ACTION")}</small><h3>{t(section.title)}</h3><p>{t(section.description)}</p></div>
                  {section.items?.length ? <ul>{section.items.map((item) => <li key={item}><span aria-hidden="true" />{t(item)}</li>)}</ul> : <div />}
                </article>
              ))}
            </div>
          </section>

          <section className="material-returns-actions">
            <div><p>{t("READY TO OPEN A CASE?")}</p><h2>{t("Keep the order reference and supporting evidence ready for the support desk.")}</h2></div>
            <div><Link href={primaryAction.href}>{t(primaryAction.label)} <span aria-hidden="true">&#8599;</span></Link><Link href={secondaryAction.href}>{t(secondaryAction.label)} <span aria-hidden="true">&#8594;</span></Link></div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isMaterialBridgeTheme && pageVariant === "privacy") {
    const recordCodes = ["INPUT", "USE", "PARTNERS", "CONTROL"];
    const informationRoute = [
      ["01", "Collected", "Account, enquiry or order"],
      ["02", "Used", "Requested storefront service"],
      ["03", "Shared", "Relevant service provider"],
      ["04", "Controlled", "Account or support request"],
    ];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="overflow-hidden bg-[#eaf2ed] text-[#0b2926]" data-information-variant="material-information-record">
          <section
            className="border-b border-[#8fb7a4]"
            style={{
              backgroundImage: "linear-gradient(rgba(16,101,66,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(16,101,66,.055) 1px,transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          >
            <div className="mx-auto grid max-w-[1400px] border-x border-[#a9c8b8] bg-[#f9fbfa]/95 lg:grid-cols-[minmax(0,1.25fr)_390px]">
              <div className="px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20 xl:px-20">
                <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#14843f]">
                  <span>{t("Buyer information record")}</span>
                  <span className="h-px w-14 bg-[#8fb7a4]" aria-hidden="true" />
                  <span>MB / PRIV-01</span>
                </div>
                <h1 className="mt-6 max-w-[820px] text-4xl font-black leading-[1.01] tracking-[-0.05em] sm:text-5xl lg:text-[56px]">
                  {t("A clear record of how buyer information moves.")}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-[#536d65] sm:text-lg">{t(introduction)}</p>
              </div>

              <aside className="relative overflow-hidden border-t border-[#a9c8b8] bg-[#0b4b32] text-white lg:border-l lg:border-t-0" aria-label={t("Policy file summary")}>
                <div className="absolute -right-16 -top-14 h-52 w-52 rounded-full border border-[#77ae91]/45" aria-hidden="true" />
                <div className="absolute right-6 top-6 h-28 w-28 rounded-full border border-[#77ae91]/45" aria-hidden="true" />
                <header className="relative border-b border-white/20 px-7 py-6">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#a6d3ba]">{t("Policy file")}</span>
                  <strong className="mt-3 block text-lg">{t(storeName)}</strong>
                </header>
                <dl className="relative divide-y divide-white/20 px-7 py-2">
                  <div className="grid grid-cols-[110px_1fr] gap-4 py-5"><dt className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#a6d3ba]">{t("Document")}</dt><dd className="text-xs font-bold">PRIV-01</dd></div>
                  <div className="grid grid-cols-[110px_1fr] gap-4 py-5"><dt className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#a6d3ba]">{t("Scope")}</dt><dd className="text-xs font-bold">{t("Buyer storefront")}</dd></div>
                  <div className="grid grid-cols-[110px_1fr] gap-4 py-5"><dt className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#a6d3ba]">{t("Sections")}</dt><dd className="text-xs font-bold">04</dd></div>
                  <div className="grid grid-cols-[110px_1fr] gap-4 py-5"><dt className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#a6d3ba]">{t("Status")}</dt><dd className="flex items-center gap-2 text-xs font-bold"><span className="h-2 w-2 rounded-full bg-[#74d398]" />{t("Storefront summary")}</dd></div>
                </dl>
              </aside>
            </div>
          </section>

          {notice ? (
            <section className="border-b border-[#8fb7a4] bg-white">
              <div className="mx-auto grid max-w-[1240px] gap-3 px-5 py-5 sm:px-8 md:grid-cols-[150px_1fr] md:items-start lg:px-10">
                <strong className="font-mono text-[9px] uppercase tracking-[0.17em] text-[#14843f]">{t("Scope note")}</strong>
                <p className="text-sm leading-6 text-[#5b736c]">{t(notice)}</p>
              </div>
            </section>
          ) : null}

          <section className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[310px_minmax(0,1fr)] lg:px-10 lg:py-20">
            <aside className="self-start lg:sticky lg:top-8">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#14843f]">{t("Information route")}</p>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em]">{t("Four checkpoints from collection to control.")}</h2>
              <div className="mt-8 border border-[#8fb7a4] bg-[#dceae2] p-5">
                {informationRoute.map(([number, label, value], index) => (
                  <div key={number} className="relative grid grid-cols-[36px_1fr] gap-3 pb-6 last:pb-0">
                    {index < informationRoute.length - 1 ? <span className="absolute left-[17px] top-8 h-[calc(100%-12px)] w-px bg-[#7aa990]" aria-hidden="true" /> : null}
                    <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#6fa287] bg-[#f8fbf9] font-mono text-[9px] font-black text-[#14843f]">{number}</span>
                    <div className="pt-0.5"><strong className="block text-sm">{t(label)}</strong><span className="mt-1 block text-xs leading-5 text-[#60776f]">{t(value)}</span></div>
                  </div>
                ))}
              </div>
              <p className="mt-5 border-l-2 border-[#14843f] pl-4 text-xs leading-6 text-[#617871]">{t("The exact handling route depends on the service requested and the applicable merchant terms.")}</p>
            </aside>

            <div className="border-t-2 border-[#0b4b32] bg-white shadow-[12px_12px_0_rgba(20,91,61,.09)]">
              <div className="hidden grid-cols-[96px_minmax(0,.9fr)_minmax(0,1.1fr)] border-b border-[#9dbdab] bg-[#0b4b32] px-7 py-4 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#b9dac8] md:grid">
                <span>{t("Record")}</span><span>{t("Information stage")}</span><span>{t("Handling notes")}</span>
              </div>
              {sections.map((section, index) => (
                <article key={section.title} id={`privacy-section-${index + 1}`} className="grid scroll-mt-8 border-b border-[#b6cfc2] last:border-b-0 md:grid-cols-[96px_minmax(0,.9fr)_minmax(0,1.1fr)]">
                  <div className="flex items-center justify-between bg-[#eef5f1] px-6 py-5 md:block md:px-7 md:py-8">
                    <span className="font-mono text-[10px] font-black text-[#14843f]">{String(index + 1).padStart(2, "0")}</span>
                    <span className="font-mono text-[8px] font-black uppercase tracking-[0.14em] text-[#6a8378] md:mt-5 md:block">{recordCodes[index] ?? "RECORD"}</span>
                  </div>
                  <div className="border-[#b6cfc2] px-6 py-6 md:border-r md:px-7 md:py-8">
                    <h3 className="text-xl font-black leading-tight tracking-[-0.025em] sm:text-2xl">{t(section.title)}</h3>
                    <p className="mt-4 text-sm leading-7 text-[#5b736c]">{t(section.description)}</p>
                  </div>
                  {section.items?.length ? (
                    <ul className="divide-y divide-[#d5e3dc] px-6 pb-6 md:px-7 md:py-5">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-3 py-3 text-sm leading-6 text-[#334f47]">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#14843f]" aria-hidden="true" />
                          <span>{t(item)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <div />}
                </article>
              ))}
            </div>
          </section>

          <section className="border-t border-[#8fb7a4] bg-[#0a3429] text-white">
            <div className="mx-auto grid max-w-[1240px] gap-7 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#9ed0b4]">{t("Information enquiry")}</p>
                <h2 className="mt-3 max-w-2xl text-2xl font-black tracking-[-0.035em] sm:text-3xl">{t("Review your account record or send a privacy question to support.")}</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={primaryAction.href} className="inline-flex min-h-12 items-center border border-[#73a58c] px-6 py-3 font-mono text-[10px] font-black uppercase tracking-[0.11em] text-white transition hover:bg-white/10">{t(primaryAction.label)}</Link>
                <Link href={secondaryAction.href} className="inline-flex min-h-12 items-center bg-[#14843f] px-6 py-3 font-mono text-[10px] font-black uppercase tracking-[0.11em] text-white transition hover:bg-[#0d6c32]">{t(secondaryAction.label)} <span className="ml-5" aria-hidden="true">&#8594;</span></Link>
              </div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isMaterialBridgeTheme && pageVariant === "terms") {
    const clauseCodes = ["ACCESS", "CATALOGUE", "ORDER", "SUPPORT"];
    const precedence = [
      ["01", "Product record", "Material, pack and availability"],
      ["02", "Quote or invoice", "Agreed commercial detail"],
      ["03", "Checkout record", "Final order confirmation"],
      ["04", "Storefront terms", "General operating conditions"],
    ];
    const transactionPath = [
      ["01", "Browse", "Review the material record"],
      ["02", "Confirm", "Check price, pack and quantity"],
      ["03", "Release", "Submit the order or enquiry"],
    ];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="overflow-hidden bg-[#f1f4ef] text-[#102c28]" data-information-variant="material-commercial-terms">
          <section className="border-b border-[#88ad99] bg-[#f8faf7]">
            <div className="mx-auto grid max-w-[1400px] border-x border-[#abc5b7] lg:grid-cols-[minmax(0,1.12fr)_470px]">
              <div className="relative overflow-hidden px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20 xl:px-20">
                <span className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full border border-[#c3d7cc]" aria-hidden="true" />
                <span className="absolute -bottom-8 right-8 h-44 w-44 rounded-full border border-[#c3d7cc]" aria-hidden="true" />
                <div className="relative">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.21em] text-[#14843f]">{t("Commercial terms register / MB-CT01")}</p>
                  <h1 className="mt-6 max-w-[770px] text-4xl font-black leading-[1.01] tracking-[-0.05em] sm:text-5xl lg:text-[56px]">{t("The conditions behind every material transaction.")}</h1>
                  <p className="mt-6 max-w-2xl text-base leading-8 text-[#577067] sm:text-lg">{t(introduction)}</p>
                  <div className="mt-8 flex flex-wrap items-center gap-4 text-xs font-bold text-[#39574e]"><span className="h-2 w-2 rounded-full bg-[#14843f]" /><span>{t(storeName)}</span><span className="text-[#91a79d]">/</span><span>{t("Buyer storefront")}</span></div>
                </div>
              </div>

              <aside className="border-t border-[#abc5b7] bg-[#0c4933] p-6 text-white sm:p-8 lg:border-l lg:border-t-0" aria-label={t("Order of precedence")}>
                <div className="flex items-end justify-between border-b border-white/25 pb-5">
                  <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#abd3bb]">{t("Priority register")}</p><h2 className="mt-2 text-xl font-black">{t("Order of precedence")}</h2></div>
                  <span className="font-mono text-[10px] text-[#abd3bb]">01—04</span>
                </div>
                <div className="divide-y divide-white/20">
                  {precedence.map(([number, label, value]) => (
                    <div key={number} className="grid grid-cols-[38px_1fr] gap-4 py-5">
                      <span className="font-mono text-[9px] font-black text-[#8fd0a8]">{number}</span>
                      <div><strong className="block text-sm">{t(label)}</strong><span className="mt-1 block text-xs leading-5 text-[#b9d5c7]">{t(value)}</span></div>
                    </div>
                  ))}
                </div>
                <p className="border-t border-white/25 pt-5 text-[11px] leading-5 text-[#b9d5c7]">{t("More specific confirmed terms take priority over this general storefront summary.")}</p>
              </aside>
            </div>
          </section>

          {notice ? (
            <section className="border-b border-[#abc5b7] bg-[#dfeae3]">
              <div className="mx-auto grid max-w-[1240px] gap-3 px-5 py-5 sm:px-8 md:grid-cols-[170px_1fr] lg:px-10">
                <strong className="font-mono text-[9px] uppercase tracking-[0.17em] text-[#14843f]">{t("Precedence note")}</strong>
                <p className="text-sm leading-6 text-[#4f685f]">{t(notice)}</p>
              </div>
            </section>
          ) : null}

          <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
            <header className="grid gap-5 border-b-2 border-[#0c4933] pb-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#14843f]">{t("Clause ledger")}</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{t("Four conditions to review before release.")}</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-[#5a7169]">{t("Read the general condition beside the practical checks that support a clear material order record.")}</p>
            </header>

            <div className="bg-white shadow-[12px_12px_0_rgba(20,91,61,.09)]">
              <div className="hidden grid-cols-[120px_minmax(0,.88fr)_minmax(0,1.12fr)] bg-[#0c4933] px-7 py-4 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#b8d7c7] md:grid">
                <span>{t("Clause")}</span><span>{t("General condition")}</span><span>{t("Buyer checks")}</span>
              </div>
              {sections.map((section, index) => (
                <article key={section.title} className="grid border-b border-[#b4cdbf] last:border-b-0 md:grid-cols-[120px_minmax(0,.88fr)_minmax(0,1.12fr)]">
                  <div className="flex items-center justify-between bg-[#e9f1ec] px-6 py-5 md:block md:px-7 md:py-8">
                    <span className="font-mono text-[11px] font-black text-[#14843f]">{String(index + 1).padStart(2, "0")}</span>
                    <span className="font-mono text-[8px] font-black uppercase tracking-[0.15em] text-[#6d857a] md:mt-5 md:block">{clauseCodes[index] ?? "TERM"}</span>
                  </div>
                  <div className="border-[#b4cdbf] px-6 py-6 md:border-r md:px-7 md:py-8">
                    <h3 className="text-xl font-black leading-tight tracking-[-0.03em] sm:text-2xl">{t(section.title)}</h3>
                    <p className="mt-4 text-sm leading-7 text-[#5a7169]">{t(section.description)}</p>
                  </div>
                  {section.items?.length ? (
                    <ol className="divide-y divide-[#d5e3dc] px-6 pb-6 md:px-7 md:py-5">
                      {section.items.map((item, itemIndex) => (
                        <li key={item} className="grid grid-cols-[28px_1fr] gap-3 py-3 text-sm leading-6 text-[#334f47]">
                          <span className="font-mono text-[8px] font-black text-[#14843f]">{String(itemIndex + 1).padStart(2, "0")}</span><span>{t(item)}</span>
                        </li>
                      ))}
                    </ol>
                  ) : <div />}
                </article>
              ))}
            </div>
          </section>

          <section className="border-y border-[#88ad99] bg-[#dce9e1]">
            <div className="mx-auto grid max-w-[1240px] lg:grid-cols-[300px_1fr]">
              <div className="border-b border-[#88ad99] px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-10">
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.19em] text-[#14843f]">{t("Transaction path")}</p>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.035em]">{t("Review before order release.")}</h2>
              </div>
              <div className="grid sm:grid-cols-3">
                {transactionPath.map(([number, label, value], index) => (
                  <div key={number} className={`px-6 py-7 sm:px-7 ${index < transactionPath.length - 1 ? "border-b border-[#a6c2b3] sm:border-b-0 sm:border-r" : ""}`}>
                    <span className="font-mono text-[9px] font-black text-[#14843f]">{number}</span><strong className="mt-3 block text-base">{t(label)}</strong><p className="mt-2 text-xs leading-5 text-[#5a7169]">{t(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-[#0a3429] text-white">
            <div className="mx-auto grid max-w-[1240px] gap-7 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
              <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#9ed0b4]">{t("Before you proceed")}</p><h2 className="mt-3 max-w-2xl text-2xl font-black tracking-[-0.035em] sm:text-3xl">{t("Review the material record, or ask the buying desk about a condition.")}</h2></div>
              <div className="flex flex-wrap gap-3"><Link href={primaryAction.href} className="inline-flex min-h-12 items-center bg-[#14843f] px-6 py-3 font-mono text-[10px] font-black uppercase tracking-[0.11em] text-white transition hover:bg-[#0d6c32]">{t(primaryAction.label)} <span className="ml-5" aria-hidden="true">&#8594;</span></Link><Link href={secondaryAction.href} className="inline-flex min-h-12 items-center border border-[#73a58c] px-6 py-3 font-mono text-[10px] font-black uppercase tracking-[0.11em] text-white transition hover:bg-white/10">{t(secondaryAction.label)}</Link></div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isMaterialBridgeTheme && pageVariant === "cancellations") {
    const stageLabels = ["CHECK", "REQUEST", "LIMIT", "ADJUST"];
    const changeWindow = [
      ["01", "Before confirmation", "Edit in cart", "open"],
      ["02", "Order processing", "Support review", "review"],
      ["03", "Prepared / dispatched", "Return route may apply", "limited"],
    ];
    const requestFields = ["Order reference", "Affected material", "Required change", "Reason and timing"];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="overflow-hidden bg-[#eef3ef] text-[#102c28]" data-information-variant="material-order-change-control">
          <section className="border-b border-[#7fa990] bg-[#0a3f2e] text-white">
            <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[minmax(0,1.05fr)_540px]">
              <div className="relative overflow-hidden px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20 xl:px-20">
                <span className="absolute -left-28 -top-32 h-80 w-80 rounded-full border border-white/10" aria-hidden="true" />
                <span className="absolute -left-4 -top-8 h-44 w-44 rounded-full border border-white/10" aria-hidden="true" />
                <div className="relative">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.21em] text-[#91d0ab]">{t("Order change control / MB-OC")}</p>
                  <h1 className="mt-6 max-w-[760px] text-4xl font-black leading-[1.01] tracking-[-0.05em] sm:text-5xl lg:text-[56px]">{t("Act before the material enters fulfilment.")}</h1>
                  <p className="mt-6 max-w-2xl text-base leading-8 text-[#bfd7ca] sm:text-lg">{t(introduction)}</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href={primaryAction.href} className="inline-flex min-h-12 items-center bg-[#168744] px-6 font-mono text-[10px] font-black uppercase tracking-[0.11em] text-white transition hover:bg-[#1a9950]">{t(primaryAction.label)} <span className="ml-6" aria-hidden="true">&#8594;</span></Link>
                    <Link href={secondaryAction.href} className="inline-flex min-h-12 items-center border border-[#78a98f] px-6 font-mono text-[10px] font-black uppercase tracking-[0.11em] text-white transition hover:bg-white/10">{t(secondaryAction.label)}</Link>
                  </div>
                </div>
              </div>

              <aside className="border-t border-white/20 bg-[#f8faf8] p-6 text-[#102c28] sm:p-8 lg:border-l lg:border-t-0 lg:p-10" aria-label={t("Cancellation window")}>
                <div className="flex items-end justify-between border-b-2 border-[#0a3f2e] pb-5">
                  <div><p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[#168744]">{t("Fulfilment position")}</p><h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">{t("Change window")}</h2></div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#8db29d] font-mono text-[9px] font-black text-[#168744]">OC</span>
                </div>
                <div className="mt-7">
                  {changeWindow.map(([number, label, value, state], index) => (
                    <div key={number} className="relative grid grid-cols-[48px_1fr_auto] gap-4 pb-7 last:pb-0">
                      {index < changeWindow.length - 1 ? <span className="absolute left-[23px] top-11 h-[calc(100%-18px)] w-px bg-[#9dbdab]" aria-hidden="true" /> : null}
                      <span className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border font-mono text-[9px] font-black ${state === "open" ? "border-[#168744] bg-[#168744] text-white" : state === "review" ? "border-[#74a58a] bg-[#dcebe2] text-[#0c6840]" : "border-[#c5a065] bg-[#fbf1dc] text-[#8a611d]"}`}>{number}</span>
                      <div className="pt-1"><strong className="block text-sm">{t(label)}</strong><span className="mt-1 block text-xs leading-5 text-[#5d746c]">{t(value)}</span></div>
                      <span className={`mt-1 h-fit px-2.5 py-1 font-mono text-[8px] font-black uppercase tracking-[0.12em] ${state === "open" ? "bg-[#dcefe3] text-[#168744]" : state === "review" ? "bg-[#e6eee9] text-[#587367]" : "bg-[#fbf1dc] text-[#8a611d]"}`}>{t(state)}</span>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </section>

          {notice ? (
            <section className="border-b border-[#8fb4a0] bg-[#f6e9cf]">
              <div className="mx-auto grid max-w-[1240px] gap-3 px-5 py-5 sm:px-8 md:grid-cols-[190px_1fr] lg:px-10">
                <strong className="font-mono text-[9px] uppercase tracking-[0.17em] text-[#8a611d]">{t("Confirmation rule")}</strong>
                <p className="text-sm font-medium leading-6 text-[#66583d]">{t(notice)}</p>
              </div>
            </section>
          ) : null}

          <section className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-10 lg:py-20">
            <div>
              <header className="border-b-2 border-[#0a3f2e] pb-7">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#168744]">{t("Change route")}</p>
                <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">{t("Match the action to the order status.")}</h2>
              </header>
              <div className="border-x border-[#a8c3b4] bg-white shadow-[10px_10px_0_rgba(20,91,61,.08)]">
                {sections.map((section, index) => (
                  <article key={section.title} className="grid border-b border-[#a8c3b4] md:grid-cols-[112px_minmax(0,.9fr)_minmax(0,1.1fr)]">
                    <div className="flex items-center justify-between bg-[#e4eee8] px-6 py-5 md:block md:px-7 md:py-8">
                      <span className="font-mono text-lg font-black text-[#168744]">{String(index + 1).padStart(2, "0")}</span>
                      <span className="font-mono text-[8px] font-black uppercase tracking-[0.15em] text-[#688075] md:mt-5 md:block">{stageLabels[index] ?? "STAGE"}</span>
                    </div>
                    <div className="border-[#b5cdbf] px-6 py-6 md:border-r md:px-7 md:py-8"><h3 className="text-xl font-black leading-tight tracking-[-0.03em] sm:text-2xl">{t(section.title)}</h3><p className="mt-4 text-sm leading-7 text-[#5a7169]">{t(section.description)}</p></div>
                    {section.items?.length ? <ul className="divide-y divide-[#d5e3dc] px-6 pb-6 md:px-7 md:py-5">{section.items.map((item) => <li key={item} className="flex gap-3 py-3 text-sm leading-6 text-[#334f47]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#168744]" aria-hidden="true" /><span>{t(item)}</span></li>)}</ul> : <div />}
                  </article>
                ))}
              </div>
            </div>

            <aside className="self-start border border-[#8fb4a0] bg-[#0c4933] text-white lg:sticky lg:top-8">
              <div className="border-b border-white/20 p-6"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#a5d2b8]">{t("Request record")}</p><h2 className="mt-3 text-2xl font-black tracking-[-0.035em]">{t("Keep four details ready.")}</h2></div>
              <ol className="divide-y divide-white/20 px-6">
                {requestFields.map((field, index) => <li key={field} className="grid grid-cols-[32px_1fr] gap-3 py-5"><span className="font-mono text-[9px] font-black text-[#8fd0a8]">{String(index + 1).padStart(2, "0")}</span><strong className="text-sm">{t(field)}</strong></li>)}
              </ol>
              <div className="border-t border-white/20 bg-[#083c2a] p-6"><p className="text-xs leading-6 text-[#b8d5c6]">{t("The support team must review the current processing position before confirming the outcome.")}</p></div>
            </aside>
          </section>

          <section className="border-t border-[#8fb4a0] bg-white">
            <div className="mx-auto grid max-w-[1240px] gap-7 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
              <div><p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#168744]">{t("Need to change an order?")}</p><h2 className="mt-3 max-w-2xl text-2xl font-black tracking-[-0.035em] sm:text-3xl">{t("Open the order record first, then contact buyer support.")}</h2></div>
              <div className="flex flex-wrap gap-3"><Link href={primaryAction.href} className="inline-flex min-h-12 items-center bg-[#168744] px-6 py-3 font-mono text-[10px] font-black uppercase tracking-[0.11em] text-white transition hover:bg-[#0f7138]">{t(primaryAction.label)} <span className="ml-5" aria-hidden="true">&#8594;</span></Link><Link href={secondaryAction.href} className="inline-flex min-h-12 items-center border border-[#79a58c] px-6 py-3 font-mono text-[10px] font-black uppercase tracking-[0.11em] text-[#0a3f2e] transition hover:bg-[#e7f0eb]">{t(secondaryAction.label)}</Link></div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isMaterialBridgeTheme && pageVariant === "cookies") {
    const storageMeta = [
      { code: "ESS", mark: "E", state: "Required", tone: "bg-[#0d6a3e] text-white" },
      { code: "PREF", mark: "P", state: "Browser stored", tone: "bg-[#dcebe2] text-[#0d6a3e]" },
      { code: "MEAS", mark: "M", state: "If enabled", tone: "bg-[#f4ead5] text-[#8a611d]" },
      { code: "CTRL", mark: "C", state: "User managed", tone: "bg-[#e7eee9] text-[#48675a]" },
    ];
    const controlBoundary = [
      ["Browser", "Stores and removes data", "01"],
      ["Storefront", "Uses enabled categories", "02"],
      ["Your controls", "Manage available choices", "03"],
    ];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="overflow-hidden bg-[#edf3ef] text-[#102c28]" data-information-variant="material-storage-manifest">
          <section
            className="border-b border-[#87ad98] bg-[#f9fbf9]"
            style={{
              backgroundImage: "linear-gradient(rgba(18,103,67,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(18,103,67,.05) 1px,transparent 1px)",
              backgroundSize: "52px 52px",
            }}
          >
            <div className="mx-auto grid max-w-[1400px] border-x border-[#abc5b7] bg-[#f9fbf9]/95 lg:grid-cols-[minmax(0,1.08fr)_520px]">
              <div className="px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20 xl:px-20">
                <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] font-black uppercase tracking-[0.21em] text-[#14843f]"><span>{t("Browser storage manifest")}</span><span className="h-px w-12 bg-[#88ad99]" /><span>MB / BSM-01</span></div>
                <h1 className="mt-6 max-w-[780px] text-4xl font-black leading-[1.01] tracking-[-0.05em] sm:text-5xl lg:text-[56px]">{t("A visible inventory of what the browser may store.")}</h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-[#577067] sm:text-lg">{t(introduction)}</p>
              </div>

              <aside className="border-t border-[#abc5b7] bg-[#dfece4] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10" aria-label={t("Storage category inventory")}>
                <header className="flex items-end justify-between border-b-2 border-[#0b4b32] pb-5"><div><p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[#14843f]">{t("Category inventory")}</p><h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">{t("Four storage groups")}</h2></div><span className="font-mono text-[9px] font-black text-[#14843f]">04 / 04</span></header>
                <div className="mt-6 grid grid-cols-2 border-l border-t border-[#91b29f]">
                  {storageMeta.map((item) => (
                    <div key={item.code} className="border-b border-r border-[#91b29f] bg-white/75 p-5">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-full font-mono text-xs font-black ${item.tone}`}>{item.mark}</div>
                      <strong className="mt-5 block font-mono text-[9px] tracking-[0.14em] text-[#14843f]">{item.code}</strong>
                      <span className="mt-2 block text-xs font-bold text-[#4f685f]">{t(item.state)}</span>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </section>

          {notice ? (
            <section className="border-b border-[#92b5a2] bg-white">
              <div className="mx-auto grid max-w-[1240px] gap-3 px-5 py-5 sm:px-8 md:grid-cols-[170px_1fr] lg:px-10"><strong className="font-mono text-[9px] uppercase tracking-[0.17em] text-[#14843f]">{t("Control note")}</strong><p className="text-sm leading-6 text-[#526c63]">{t(notice)}</p></div>
            </section>
          ) : null}

          <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
            <header className="grid gap-5 border-b-2 border-[#0b4b32] pb-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
              <div><p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#14843f]">{t("Storage specification")}</p><h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{t("Purpose, contents and control.")}</h2></div>
              <p className="max-w-2xl text-sm leading-7 text-[#5a7169]">{t("Each category supports a different part of the storefront and may have a different control route.")}</p>
            </header>

            <div className="border-x border-[#a7c2b3] bg-white shadow-[12px_12px_0_rgba(20,91,61,.08)]">
              {sections.map((section, index) => {
                const meta = storageMeta[index] ?? storageMeta[0];
                return (
                  <article key={section.title} className="grid border-b border-[#a7c2b3] lg:grid-cols-[150px_minmax(0,.9fr)_minmax(0,1.1fr)]">
                    <div className="flex items-center justify-between bg-[#e5eee8] px-6 py-5 lg:block lg:px-7 lg:py-8">
                      <span className={`flex h-14 w-14 items-center justify-center rounded-full font-mono text-sm font-black ${meta.tone}`}>{meta.mark}</span>
                      <div className="text-right lg:mt-6 lg:text-left"><span className="block font-mono text-[9px] font-black tracking-[0.15em] text-[#14843f]">{meta.code}</span><span className="mt-1 block text-[10px] font-bold text-[#647c72]">{t(meta.state)}</span></div>
                    </div>
                    <div className="border-[#b5cdbf] px-6 py-6 lg:border-r lg:px-8 lg:py-8"><h3 className="text-xl font-black leading-tight tracking-[-0.03em] sm:text-2xl">{t(section.title)}</h3><p className="mt-4 text-sm leading-7 text-[#5a7169]">{t(section.description)}</p></div>
                    {section.items?.length ? <ul className="grid gap-px bg-[#d3e1d9] sm:grid-cols-3 lg:grid-cols-1">{section.items.map((item, itemIndex) => <li key={item} className="flex gap-3 bg-white px-6 py-4 text-sm leading-6 text-[#334f47]"><span className="font-mono text-[8px] font-black text-[#14843f]">{String(itemIndex + 1).padStart(2, "0")}</span><span>{t(item)}</span></li>)}</ul> : <div />}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="border-y border-[#87ad98] bg-[#0b4b32] text-white">
            <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
              <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:items-center">
                <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#9ed0b4]">{t("Control boundary")}</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">{t("Three places shape the outcome.")}</h2></div>
                <div className="grid border border-[#4f7b66] sm:grid-cols-3">
                  {controlBoundary.map(([label, value, number], index) => <div key={label} className={`relative p-6 ${index < controlBoundary.length - 1 ? "border-b border-[#4f7b66] sm:border-b-0 sm:border-r" : ""}`}><span className="font-mono text-[9px] font-black text-[#9ed0b4]">{number}</span><strong className="mt-4 block text-base">{t(label)}</strong><p className="mt-2 text-xs leading-5 text-[#b8d5c6]">{t(value)}</p>{index < controlBoundary.length - 1 ? <span className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#14843f] text-xs sm:flex" aria-hidden="true">&#8594;</span> : null}</div>)}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white">
            <div className="mx-auto grid max-w-[1240px] gap-7 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
              <div><p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#14843f]">{t("Need more detail?")}</p><h2 className="mt-3 max-w-2xl text-2xl font-black tracking-[-0.035em] sm:text-3xl">{t("Return to the storefront or ask support about information controls.")}</h2></div>
              <div className="flex flex-wrap gap-3"><Link href={primaryAction.href} className="inline-flex min-h-12 items-center bg-[#14843f] px-6 py-3 font-mono text-[10px] font-black uppercase tracking-[0.11em] text-white transition hover:bg-[#0d6c32]">{t(primaryAction.label)} <span className="ml-5" aria-hidden="true">&#8594;</span></Link><Link href={secondaryAction.href} className="inline-flex min-h-12 items-center border border-[#79a58c] px-6 py-3 font-mono text-[10px] font-black uppercase tracking-[0.11em] text-[#0b4b32] transition hover:bg-[#e7f0eb]">{t(secondaryAction.label)}</Link></div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isCoatCraftTheme && pageVariant === "shipping") {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="bg-[#eef4f6] text-[#08283d]" data-information-variant="shipping-journey">
          <section className="border-b border-[#bdd4dc] bg-[#e7f2f6]">
            <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_470px] lg:items-center lg:px-10 lg:py-16">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0879ad]">{t(eyebrow)}</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.045em] sm:text-5xl">{t(title)}</h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">{t(introduction)}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href={primaryAction.href} className="inline-flex min-h-12 items-center rounded-xl bg-[#0879ad] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_25px_rgba(8,121,173,0.2)] transition hover:bg-[#056b9a]">{t(primaryAction.label)} <span className="ml-3" aria-hidden="true">→</span></Link>
                  <Link href={secondaryAction.href} className="inline-flex min-h-12 items-center rounded-xl border border-[#9fc4d2] bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-[#062f45] transition hover:border-[#0879ad]">{t(secondaryAction.label)}</Link>
                </div>
              </div>

              <aside className="overflow-hidden rounded-[24px] border border-[#a9c9d5] bg-white shadow-[0_20px_50px_rgba(6,47,69,0.1)]" aria-label={t("Delivery journey") }>
                <div className="flex items-center justify-between bg-[#062f45] px-6 py-5 text-white"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#6ec9ed]">{t("Delivery journey")}</p><h2 className="mt-1 text-lg font-black">{t("From requirement to receipt")}</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg" aria-hidden="true">↗</span></div>
                <div className="p-6 sm:p-7">
                  {highlights.map((highlight, index) => (
                    <div key={highlight.label} className="relative flex gap-4 pb-6 last:pb-0">
                      {index < highlights.length - 1 ? <span className="absolute left-[17px] top-9 h-[calc(100%-20px)] w-px bg-[#bdd4dc]" aria-hidden="true" /> : null}
                      <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${index === 0 ? "bg-[#0879ad] text-white" : "border border-[#accbd7] bg-[#eef6f8] text-[#0879ad]"}`}>0{index + 1}</span>
                      <div><p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{t(highlight.label)}</p><p className="mt-1 text-sm font-black text-[#08283d]">{t(highlight.value)}</p></div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </section>

          <section className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
            <div className="grid gap-6 border-b border-[#bad3dc] pb-8 md:grid-cols-[310px_minmax(0,1fr)] md:items-end">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("Delivery planning")}</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">{t("What to expect at each stage")}</h2></div>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">{t("Use these checkpoints to prepare the destination, follow dispatch updates and receive the shipment with confidence.")}</p>
            </div>

            {notice ? (
              <div className="mt-7 flex gap-4 rounded-2xl border border-[#bfd6de] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(6,47,69,0.04)]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dceef4] text-[10px] font-black text-[#0879ad]" aria-hidden="true">i</span>
                <p className="text-sm leading-6 text-slate-600"><strong className="text-[#08283d]">{t("Planning note:")} </strong>{t(notice)}</p>
              </div>
            ) : null}

            <div className="mt-8 overflow-hidden rounded-[24px] border border-[#b8d1da] bg-white shadow-[0_22px_55px_rgba(6,47,69,0.07)]">
              {sections.map((section, index) => (
                <article key={section.title} className="grid border-b border-[#d3e1e6] last:border-b-0 md:grid-cols-[92px_300px_minmax(0,1fr)]">
                  <div className="flex items-center justify-between bg-[#e7f2f5] px-5 py-4 md:block md:px-6 md:py-7">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[11px] font-black text-[#0879ad] shadow-sm">0{index + 1}</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.13em] text-[#7194a3] md:mt-8 md:block">{t("Stage")}</span>
                  </div>
                  <div className="border-[#d3e1e6] px-5 py-5 md:border-r md:px-7 md:py-7">
                    <h3 className="text-xl font-black tracking-[-0.03em]">{t(section.title)}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{t(section.description)}</p>
                  </div>
                  {section.items?.length ? (
                    <ul className="divide-y divide-[#e0eaed] px-5 pb-5 md:px-7 md:py-3">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-3 py-3 text-sm font-medium leading-6 text-slate-700">
                          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e2f1f5] text-[9px] font-black text-[#0879ad]" aria-hidden="true">✓</span>
                          <span>{t(item)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <div />}
                </article>
              ))}
            </div>
          </section>

          <section className="bg-[#062f45] text-white">
            <div className="mx-auto grid max-w-[1180px] gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6ec9ed]">{t("Delivery support")}</p><h2 className="mt-2 max-w-2xl text-xl font-black sm:text-2xl">{t("Keep your order reference ready when asking about dispatch or delivery.")}</h2><p className="mt-2 text-xs text-white/55">{storeName}</p></div>
              <div className="flex flex-wrap gap-3"><Link href={primaryAction.href} className="inline-flex min-h-12 items-center rounded-xl bg-[#0a8ec2] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#119dce]">{t(primaryAction.label)}</Link><Link href={secondaryAction.href} className="inline-flex min-h-12 items-center rounded-xl border border-white/25 px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:border-white">{t(secondaryAction.label)}</Link></div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isCoatCraftTheme && pageVariant === "returns") {
    const preparationItems = [
      "Order reference",
      "Product and quantity",
      "Reason for the request",
      "Photos when relevant",
    ];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="bg-[#f5f7f6] text-[#08283d]" data-information-variant="returns-support-path">
          <section className="border-b border-[#c6d8de] bg-white">
            <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:px-10 lg:py-16">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0879ad]">{t(eyebrow)}</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.06] tracking-[-0.045em] sm:text-5xl">{t("Start with the order. We will guide the next step.")}</h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">{t(introduction)}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href={primaryAction.href} className="inline-flex min-h-12 items-center rounded-xl bg-[#0879ad] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_25px_rgba(8,121,173,0.2)] transition hover:bg-[#056b9a]">{t(primaryAction.label)} <span className="ml-3" aria-hidden="true">→</span></Link>
                  <Link href={secondaryAction.href} className="inline-flex min-h-12 items-center rounded-xl border border-[#a8c6d1] bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-[#08283d] transition hover:border-[#0879ad]">{t(secondaryAction.label)}</Link>
                </div>
              </div>

              <aside className="overflow-hidden rounded-[24px] border border-[#b6d0d9] bg-[#edf5f7] shadow-[12px_12px_0_#dcebee]" aria-label={t("Prepare your request") }>
                <div className="bg-[#0a3a52] px-6 py-5 text-white"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#78d5f5]">{t("Before contacting support")}</p><h2 className="mt-2 text-xl font-black">{t("Prepare these details")}</h2></div>
                <ul className="divide-y divide-[#cbdde3] px-6 py-2">
                  {preparationItems.map((item, index) => (
                    <li key={item} className="flex items-center gap-4 py-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#0879ad] shadow-sm">0{index + 1}</span><span className="text-sm font-bold text-[#163d50]">{t(item)}</span></li>
                  ))}
                </ul>
              </aside>
            </div>
          </section>

          <section className="mx-auto grid max-w-[1180px] gap-9 px-5 py-12 sm:px-8 lg:grid-cols-[290px_minmax(0,1fr)] lg:px-10 lg:py-16">
            <aside className="self-start lg:sticky lg:top-28">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("Support process")}</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">{t("A clear path from issue to outcome")}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{t("Follow each stage in order and wait for return instructions before sending a product.")}</p>
              {notice ? <div className="mt-7 rounded-2xl border border-[#c7d9df] bg-[#e9f2f5] p-5"><strong className="text-[9px] font-black uppercase tracking-[0.15em] text-[#0879ad]">{t("Important")}</strong><p className="mt-2 text-xs leading-6 text-slate-600">{t(notice)}</p></div> : null}
            </aside>

            <div>
              {sections.map((section, index) => (
                <article key={section.title} className="relative grid grid-cols-[52px_minmax(0,1fr)] gap-4 pb-6 last:pb-0 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-5">
                  {index < sections.length - 1 ? <span className="absolute left-[25px] top-12 h-[calc(100%-30px)] w-px bg-[#b9d3dc] sm:left-[31px]" aria-hidden="true" /> : null}
                  <span className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl text-xs font-black shadow-sm sm:h-14 sm:w-14 ${index === 0 ? "bg-[#0879ad] text-white" : "border border-[#b7d0d9] bg-white text-[#0879ad]"}`}>0{index + 1}</span>
                  <div className="rounded-[22px] border border-[#d2e0e5] bg-white p-5 shadow-[0_12px_34px_rgba(6,47,69,0.05)] sm:p-7">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-9">
                      <div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#0879ad]">{t("Step")} {index + 1}</p><h3 className="mt-2 text-xl font-black tracking-[-0.03em] sm:text-2xl">{t(section.title)}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{t(section.description)}</p></div>
                      {section.items?.length ? <ul className="divide-y divide-[#e0eaed] border-t border-[#e0eaed] lg:border-t-0">{section.items.map((item) => <li key={item} className="flex gap-3 py-3 text-sm font-medium leading-6 text-slate-700"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e2f1f5] text-[9px] font-black text-[#0879ad]" aria-hidden="true">✓</span><span>{t(item)}</span></li>)}</ul> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="border-t border-[#c3d8df] bg-[#e5f1f5]">
            <div className="mx-auto grid max-w-[1180px] gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0879ad]">{t("Need to report an issue?")}</p><h2 className="mt-2 max-w-2xl text-xl font-black sm:text-2xl">{t("Open the order first, then share the reference with buyer support.")}</h2><p className="mt-2 text-xs text-slate-500">{storeName}</p></div>
              <div className="flex flex-wrap gap-3"><Link href={primaryAction.href} className="inline-flex min-h-12 items-center rounded-xl border border-[#9fc4d2] bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-[#062f45] transition hover:border-[#0879ad]">{t(primaryAction.label)}</Link><Link href={secondaryAction.href} className="inline-flex min-h-12 items-center rounded-xl bg-[#0879ad] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#056b9a]">{t(secondaryAction.label)} <span className="ml-3" aria-hidden="true">→</span></Link></div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isCoatCraftTheme && pageVariant === "privacy") {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="bg-[#f4f8fa] text-[#08283d]" data-information-variant="privacy-document">
          <section className="border-b border-[#bad4de] bg-[#e8f3f7]">
            <div className="mx-auto grid max-w-[1320px] gap-9 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end lg:px-10 lg:py-16">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0879ad]">{t(eyebrow)}</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.04em] sm:text-5xl">{t("Privacy, explained clearly.")}</h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">{t(introduction)}</p>
              </div>
              <aside className="border-l-4 border-[#0879ad] bg-white px-6 py-5 shadow-[0_14px_35px_rgba(6,47,69,0.07)]">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#0879ad]">{t("Policy overview")}</p>
                <p className="mt-3 text-sm font-bold leading-6">{t("This summary covers account, enquiry and order information used across the storefront.")}</p>
                <p className="mt-3 text-xs leading-5 text-slate-500">{storeName}</p>
              </aside>
            </div>
          </section>

          <section className="mx-auto grid max-w-[1320px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-10 lg:py-16">
            <aside className="self-start lg:sticky lg:top-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("On this page")}</p>
              <nav className="mt-5 border-t border-[#b9d5df]" aria-label={t("Privacy policy sections")}>
                {sections.map((section, index) => (
                  <a key={section.title} href={`#privacy-section-${index + 1}`} className="group flex items-center justify-between border-b border-[#b9d5df] py-4 text-sm font-bold text-slate-600 transition hover:text-[#0879ad]">
                    <span>{t(section.title)}</span><span className="text-[10px] text-[#0879ad]">0{index + 1}</span>
                  </a>
                ))}
              </nav>
              {notice ? (
                <div className="mt-7 bg-[#dcecf2] p-5 text-xs leading-6 text-slate-600">
                  <strong className="block text-[9px] uppercase tracking-[0.14em] text-[#062f45]">{t("Important note")}</strong>
                  <span className="mt-2 block">{t(notice)}</span>
                </div>
              ) : null}
            </aside>

            <article className="bg-white px-6 shadow-[0_22px_60px_rgba(6,47,69,0.08)] sm:px-9 lg:px-12">
              {sections.map((section, index) => (
                <section key={section.title} id={`privacy-section-${index + 1}`} className="scroll-mt-8 border-b border-[#d4e2e7] py-9 last:border-b-0 sm:py-11">
                  <div className="grid gap-5 sm:grid-cols-[62px_minmax(0,1fr)]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e4f1f6] text-[10px] font-black text-[#0879ad]">0{index + 1}</span>
                    <div>
                      <h2 className="text-2xl font-black tracking-[-0.03em] sm:text-3xl">{t(section.title)}</h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{t(section.description)}</p>
                      {section.items?.length ? (
                        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                          {section.items.map((item) => (
                            <li key={item} className="flex gap-3 border-t border-[#e1eaee] pt-3 text-sm leading-6 text-slate-700">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0879ad]" aria-hidden="true" />
                              <span>{t(item)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </section>
              ))}
            </article>
          </section>

          <section className="border-t border-[#bad4de] bg-white">
            <div className="mx-auto grid max-w-[1320px] gap-6 px-5 py-9 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0879ad]">{t("Questions about your information?")}</p><h2 className="mt-2 text-xl font-black sm:text-2xl">{t("Use your account controls or contact the support team.")}</h2></div>
              <div className="flex flex-wrap gap-3">
                <Link href={primaryAction.href} className="inline-flex min-h-12 items-center border border-[#9fc4d2] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-[#062f45] transition hover:border-[#0879ad]">{t(primaryAction.label)}</Link>
                <Link href={secondaryAction.href} className="inline-flex min-h-12 items-center bg-[#0879ad] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#05648f]">{t(secondaryAction.label)}</Link>
              </div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isCoatCraftTheme && pageVariant === "cookies") {
    const storageStates = [
      { name: "Essential", state: "Required", dot: "bg-[#0879ad]", badge: "bg-[#dceff6] text-[#0879ad]" },
      { name: "Preferences", state: "Browser controlled", dot: "bg-[#5d7c8b]", badge: "bg-[#e8eef1] text-[#496371]" },
      { name: "Measurement", state: "If enabled", dot: "bg-[#c68a23]", badge: "bg-[#fff0d5] text-[#8b5b0a]" },
      { name: "Management", state: "Your choice", dot: "bg-[#4f7655]", badge: "bg-[#e5efe5] text-[#3f6545]" },
    ];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="bg-[#f3f6f7] text-[#08283d]" data-information-variant="cookie-dashboard">
          <section className="border-b border-[#bfd4dc] bg-white">
            <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:px-10 lg:py-16">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0879ad]">{t(eyebrow)}</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.06] tracking-[-0.045em] sm:text-5xl">{t("Browser storage, without the mystery.")}</h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">{t(introduction)}</p>
                <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#0879ad]" aria-hidden="true" />{t("Keeps core features working")}</span>
                  <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#4f7655]" aria-hidden="true" />{t("Managed through available controls")}</span>
                </div>
              </div>

              <aside className="overflow-hidden border border-[#adcbd6] bg-[#eef6f8] shadow-[0_18px_45px_rgba(6,47,69,0.08)]" aria-label={t("Storage category overview")}>
                <div className="flex items-center gap-2 border-b border-[#c3d9e1] bg-[#062f45] px-5 py-3 text-white">
                  <span className="h-2 w-2 rounded-full bg-[#ff756b]" /><span className="h-2 w-2 rounded-full bg-[#ffd166]" /><span className="h-2 w-2 rounded-full bg-[#77d19a]" />
                  <span className="ml-3 flex-1 rounded-sm bg-white/10 px-3 py-1 text-[9px] font-bold tracking-[0.08em] text-white/70">{t("STORE / BROWSER STORAGE")}</span>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between border-b border-[#c6dbe2] pb-4"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#0879ad]">{t("Storage overview")}</p><h2 className="mt-1 text-lg font-black">{t("Typical storefront categories")}</h2></div><span className="text-2xl" aria-hidden="true">◌</span></div>
                  <div className="divide-y divide-[#cfdee3]">
                    {storageStates.map((item) => (
                      <div key={item.name} className="flex items-center gap-3 py-3.5">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`} aria-hidden="true" />
                        <strong className="flex-1 text-sm">{t(item.name)}</strong>
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] ${item.badge}`}>{t(item.state)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
            <div className="grid gap-5 md:grid-cols-[300px_1fr] md:items-end">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("Storage guide")}</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em]">{t("What each category does")}</h2></div>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">{t("A clear overview of why browser storage may be used and where you can manage it.")}</p>
            </div>

            {notice ? (
              <div className="mt-8 grid gap-2 border-y border-[#b9d3dc] bg-[#e7f1f4] px-5 py-5 sm:grid-cols-[130px_1fr] sm:px-6">
                <strong className="text-[10px] uppercase tracking-[0.14em] text-[#0879ad]">{t("Your controls")}</strong>
                <p className="text-sm leading-6 text-slate-600">{t(notice)}</p>
              </div>
            ) : null}

            <div className="mt-8 border-t-2 border-[#062f45] bg-white shadow-[0_22px_55px_rgba(6,47,69,0.06)]">
              {sections.map((section, index) => (
                <section key={section.title} className="grid border-b border-[#d1e0e5] last:border-b-0 md:grid-cols-[90px_250px_minmax(0,1fr)]">
                  <div className="flex items-center justify-between bg-[#f3f8f9] px-5 py-4 md:block md:px-6 md:py-7">
                    <span className={`block h-3 w-3 rounded-full ${storageStates[index]?.dot ?? "bg-[#0879ad]"}`} aria-hidden="true" />
                    <span className="text-[10px] font-black tracking-[0.16em] text-[#7595a3] md:mt-5 md:block">0{index + 1}</span>
                  </div>
                  <div className="border-[#d1e0e5] px-5 py-5 md:border-r md:px-6 md:py-7">
                    <span className={`inline-block px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] ${storageStates[index]?.badge ?? "bg-[#dceff6] text-[#0879ad]"}`}>{t(storageStates[index]?.state ?? "Storage")}</span>
                    <h3 className="mt-3 text-xl font-black tracking-[-0.025em]">{t(section.title)}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{t(section.description)}</p>
                  </div>
                  {section.items?.length ? (
                    <ul className="divide-y divide-[#e0eaed] px-5 pb-5 md:px-7 md:py-4">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-3 py-3 text-sm font-medium leading-6 text-slate-700">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0879ad]" aria-hidden="true" />
                          <span>{t(item)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <div />}
                </section>
              ))}
            </div>
          </section>

          <section className="border-t border-[#bfd4dc] bg-white">
            <div className="mx-auto grid max-w-[1180px] gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0879ad]">{t("Need more information?")}</p><h2 className="mt-2 max-w-2xl text-xl font-black sm:text-2xl">{t("Use your browser settings or ask the support team about storefront privacy.")}</h2></div>
              <div className="flex flex-wrap gap-3">
                <Link href={primaryAction.href} className="inline-flex min-h-12 items-center border border-[#9fc4d2] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-[#062f45] transition hover:border-[#0879ad]">{t(primaryAction.label)}</Link>
                <Link href={secondaryAction.href} className="inline-flex min-h-12 items-center bg-[#0879ad] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#05648f]">{t(secondaryAction.label)} <span className="ml-3" aria-hidden="true">→</span></Link>
              </div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isCoatCraftTheme && pageVariant === "cancellations") {
    const cancellationStages = [
      { label: "Cart", value: "Edit products and quantities yourself", tone: "bg-[#d9eef5] text-[#0879ad]" },
      { label: "Order submitted", value: "Contact support as soon as possible", tone: "bg-[#e8f1df] text-[#3f6c2f]" },
      { label: "Preparing", value: "The seller must approve the request", tone: "bg-[#fff0cf] text-[#8a5a00]" },
      { label: "Dispatched", value: "The returns process may be required", tone: "bg-[#f4e6e3] text-[#8d463b]" },
    ];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="bg-[#eef4f6] text-[#08283d]" data-information-variant="cancellation-path">
          <section className="border-b border-[#bfd5dd] bg-white">
            <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:px-10 lg:py-16">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0879ad]">{t(eyebrow)}</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.06] tracking-[-0.045em] sm:text-5xl">{t("Need to change an order? Start here.")}</h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">{t(introduction)}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href={secondaryAction.href} className="inline-flex min-h-12 items-center bg-[#0879ad] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#05648f]">{t(secondaryAction.label)} <span className="ml-3" aria-hidden="true">↗</span></Link>
                  <Link href={primaryAction.href} className="inline-flex min-h-12 items-center border border-[#9fc4d2] bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-[#062f45] transition hover:border-[#0879ad]">{t(primaryAction.label)}</Link>
                </div>
              </div>

              <aside className="border border-[#b8d1da] bg-[#f6fafb] p-6 shadow-[12px_12px_0_#dcebef] sm:p-7" aria-label={t("Cancellation window")}>
                <div className="flex items-end justify-between gap-4 border-b border-[#c9dce3] pb-4">
                  <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#0879ad]">{t("Cancellation window")}</p><h2 className="mt-2 text-xl font-black">{t("Check the current order stage")}</h2></div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0879ad] text-lg font-black text-white" aria-hidden="true">!</span>
                </div>
                <div className="divide-y divide-[#d5e3e8]">
                  {cancellationStages.map((stage) => (
                    <div key={stage.label} className="grid grid-cols-[108px_1fr] gap-4 py-3.5">
                      <span className={`w-fit self-start px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] ${stage.tone}`}>{t(stage.label)}</span>
                      <p className="text-sm font-bold leading-5 text-slate-700">{t(stage.value)}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </section>

          <section className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
            <div className="grid gap-5 border-b border-[#bfd5dd] pb-8 md:grid-cols-[260px_1fr] md:items-end">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("Request process")}</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em]">{t("What happens next")}</h2></div>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">{t("The available action depends on how far the order has progressed. Use the steps below to prepare a clear request.")}</p>
            </div>

            {notice ? (
              <div className="mt-8 flex gap-4 border-l-4 border-[#0879ad] bg-white px-5 py-4 shadow-[0_10px_28px_rgba(6,47,69,0.05)]">
                <span className="mt-0.5 text-sm font-black text-[#0879ad]" aria-hidden="true">i</span>
                <p className="text-sm leading-6 text-slate-600"><strong className="text-[#08283d]">{t("Please note:")} </strong>{t(notice)}</p>
              </div>
            ) : null}

            <div className="mt-8 overflow-hidden border border-[#b8d1da] bg-white shadow-[0_22px_55px_rgba(6,47,69,0.07)]">
              {sections.map((section, index) => (
                <section key={section.title} className="grid border-b border-[#d2e1e6] last:border-b-0 md:grid-cols-[150px_minmax(0,1fr)]">
                  <div className="flex items-center justify-between bg-[#e4f0f4] px-5 py-5 md:block md:px-7 md:py-8">
                    <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#0879ad]">{t("Step")} {index + 1}</span>
                    <span className="text-2xl font-black text-[#9fc4d2] md:mt-5 md:block">0{index + 1}</span>
                  </div>
                  <div className="px-5 py-6 sm:px-7 md:py-8 lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-10">
                    <div>
                      <h3 className="text-xl font-black tracking-[-0.025em] sm:text-2xl">{t(section.title)}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{t(section.description)}</p>
                    </div>
                    {section.items?.length ? (
                      <ul className="mt-6 divide-y divide-[#dce7eb] border-t border-[#dce7eb] lg:mt-0">
                        {section.items.map((item) => (
                          <li key={item} className="flex gap-3 py-3 text-sm font-medium leading-6 text-slate-700">
                            <span className="mt-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#dceef4] text-[9px] font-black text-[#0879ad]" aria-hidden="true">✓</span>
                            <span>{t(item)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <section className="bg-[#0879ad] text-white">
            <div className="mx-auto grid max-w-[1180px] gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#bce8f8]">{t("Time matters")}</p><h2 className="mt-2 max-w-2xl text-xl font-black sm:text-2xl">{t("Have the order reference ready and contact support promptly.")}</h2></div>
              <Link href={secondaryAction.href} className="inline-flex min-h-12 w-fit items-center bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-[#062f45] transition hover:bg-[#e9f5f9]">{t(secondaryAction.label)} <span className="ml-3" aria-hidden="true">→</span></Link>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isCoatCraftTheme && pageVariant === "terms") {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="bg-[#f7f8f6] text-[#08283d]" data-information-variant="terms-ledger">
          <section className="border-b border-[#c3d8df] bg-white">
            <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center lg:px-10 lg:py-16">
              <div className="border-l-4 border-[#0879ad] pl-6 sm:pl-8">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0879ad]">{t(eyebrow)}</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.04em] sm:text-5xl">{t("Clear conditions for using the storefront.")}</h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">{t(introduction)}</p>
              </div>
              <aside className="bg-[#e6f1f5] p-6 sm:p-7">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#0879ad]">{t("Terms at a glance")}</p>
                <dl className="mt-5 divide-y divide-[#b9d5df] border-y border-[#b9d5df]">
                  <div className="py-3"><dt className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{t("Account")}</dt><dd className="mt-1 text-sm font-bold">{t("Use accurate information and protect access")}</dd></div>
                  <div className="py-3"><dt className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{t("Catalogue")}</dt><dd className="mt-1 text-sm font-bold">{t("Product details can change before confirmation")}</dd></div>
                  <div className="py-3"><dt className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{t("Orders")}</dt><dd className="mt-1 text-sm font-bold">{t("Checkout and seller terms form the final conditions")}</dd></div>
                </dl>
              </aside>
            </div>
          </section>

          <section className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
            {notice ? (
              <div className="mb-10 grid gap-3 border-y border-[#bad4de] bg-[#edf5f8] px-5 py-5 sm:grid-cols-[150px_1fr] sm:px-6">
                <strong className="text-[10px] uppercase tracking-[0.16em] text-[#0879ad]">{t("Priority of terms")}</strong>
                <p className="text-sm leading-6 text-slate-600">{t(notice)}</p>
              </div>
            ) : null}

            <div className="border-t-2 border-[#062f45]">
              {sections.map((section, index) => (
                <section key={section.title} className="grid gap-6 border-b border-[#cbdde3] py-9 sm:grid-cols-[220px_minmax(0,1fr)] sm:py-11 lg:grid-cols-[290px_minmax(0,1fr)]">
                  <div>
                    <span className="text-[10px] font-black tracking-[0.18em] text-[#0879ad]">CLAUSE 0{index + 1}</span>
                    <h2 className="mt-3 text-xl font-black leading-tight tracking-[-0.025em] sm:text-2xl">{t(section.title)}</h2>
                  </div>
                  <div>
                    <p className="max-w-3xl text-base leading-7 text-slate-600">{t(section.description)}</p>
                    {section.items?.length ? (
                      <ul className="mt-6 grid gap-x-7 gap-y-3 sm:grid-cols-2">
                        {section.items.map((item) => (
                          <li key={item} className="flex gap-3 border-t border-[#dce7eb] pt-3 text-sm leading-6 text-slate-700">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#0879ad]" aria-hidden="true" />
                            <span>{t(item)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <section className="bg-[#062f45] text-white">
            <div className="mx-auto grid max-w-[1180px] gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6ec0e5]">{t("Need clarification?")}</p><h2 className="mt-2 text-xl font-black sm:text-2xl">{t("Review the catalogue or ask the support team a question.")}</h2></div>
              <div className="flex flex-wrap gap-3">
                <Link href={primaryAction.href} className="inline-flex min-h-12 items-center bg-[#0879ad] px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#1193ca]">{t(primaryAction.label)}</Link>
                <Link href={secondaryAction.href} className="inline-flex min-h-12 items-center border border-white/35 px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:border-white">{t(secondaryAction.label)}</Link>
              </div>
            </div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isCoatCraftTheme && pageVariant === "offers") {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="cc-offers-page">
          <section className="cc-offers-hero">
            <div className="cc-offers-hero-copy">
              <p>{t(eyebrow)}</p>
              <h1>{t(title)}</h1>
              <p>{t(introduction)}</p>
              <Link href={primaryAction.href}>{t(primaryAction.label)}</Link>
            </div>
            <dl className="cc-offers-facts">
              {highlights.map((highlight) => <div key={highlight.label}><dt>{t(highlight.label)}</dt><dd>{t(highlight.value)}</dd></div>)}
            </dl>
          </section>
          <section className="cc-offers-directory">
            <header>
              <p>{t("Offer guide")}</p>
              <h2>{t("Understand every buying opportunity before checkout.")}</h2>
              {notice ? <div><strong>{t("Please note:")}</strong> {t(notice)}</div> : null}
            </header>
            <div className="cc-offers-rows">
              {sections.map((section) => (
                <article key={section.title}>
                  <h3>{t(section.title)}</h3>
                  <p>{t(section.description)}</p>
                  {section.items?.length ? <ul>{section.items.map((item) => <li key={item}>{t(item)}</li>)}</ul> : null}
                </article>
              ))}
            </div>
          </section>
          <section className="cc-offers-actions">
            <div><p>{t("Ready to compare?")}</p><h2>{t("Browse eligible catalogue products or plan a larger requirement.")}</h2></div>
            <div><Link href={primaryAction.href}>{t(primaryAction.label)}</Link><Link href={secondaryAction.href}>{t(secondaryAction.label)}</Link></div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isCoatCraftTheme && pageVariant === "buying-guide") {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="cc-guide-page">
          <section className="cc-guide-hero">
            <p>{t(eyebrow)}</p>
            <h1>{t(title)}</h1>
            <p>{t(introduction)}</p>
            <nav aria-label={t("Buying journey")}>
              {highlights.map((highlight) => <div key={highlight.label}><strong>{t(highlight.label)}</strong><span>{t(highlight.value)}</span></div>)}
            </nav>
          </section>
          <section className="cc-guide-journey">
            <header>
              <p>{t("Four clear stages")}</p>
              <h2>{t("Move from product search to confirmed order with confidence.")}</h2>
              <span>{t("Use each stage as a practical checklist while you browse and compare.")}</span>
            </header>
            <div>
              {sections.map((section) => (
                <article key={section.title}>
                  <div aria-hidden="true" />
                  <div><h3>{t(section.title)}</h3><p>{t(section.description)}</p></div>
                  {section.items?.length ? <ul>{section.items.map((item) => <li key={item}>{t(item)}</li>)}</ul> : null}
                </article>
              ))}
            </div>
          </section>
          <section className="cc-guide-actions">
            <div><p>{t("Start the journey")}</p><h2>{t("Find a product first, then use the guide at each buying decision.")}</h2></div>
            <div><Link href={primaryAction.href}>{t(primaryAction.label)}</Link><Link href={secondaryAction.href}>{t(secondaryAction.label)}</Link></div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (isCoatCraftTheme && pageVariant === "bulk-orders") {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="cc-bulk-page">
          <section className="cc-bulk-hero">
            <div><p>{t(eyebrow)}</p><h1>{t(title)}</h1><span>{t(introduction)}</span></div>
            <aside>
              <p>{t("Request checklist")}</p>
              <h2>{t("Prepare these details before contacting the buying desk.")}</h2>
              <dl>{highlights.map((highlight) => <div key={highlight.label}><dt>{t(highlight.label)}</dt><dd>{t(highlight.value)}</dd></div>)}</dl>
            </aside>
          </section>
          <section className="cc-bulk-workspace">
            <aside>
              <p>{t("Commercial review")}</p>
              <h2>{t("What happens after you share the requirement?")}</h2>
              {notice ? <div><strong>{t("Please note:")}</strong> {t(notice)}</div> : null}
              <Link href={secondaryAction.href}>{t(secondaryAction.label)}</Link>
            </aside>
            <div>
              {sections.map((section) => (
                <article key={section.title}>
                  <h3>{t(section.title)}</h3>
                  <p>{t(section.description)}</p>
                  {section.items?.length ? <ul>{section.items.map((item) => <li key={item}>{t(item)}</li>)}</ul> : null}
                </article>
              ))}
            </div>
          </section>
          <section className="cc-bulk-actions">
            <div><p>{t(storeName)}</p><h2>{t("Build a clear product shortlist before you contact the buying desk.")}</h2></div>
            <div><Link href={primaryAction.href}>{t(primaryAction.label)}</Link><Link href={secondaryAction.href}>{t(secondaryAction.label)}</Link></div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <main className="storefront-information-page overflow-hidden bg-[#f5f6f4] text-slate-950" data-information-variant={pageVariant}>
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div className="pointer-events-none absolute -right-36 -top-56 h-[34rem] w-[34rem] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 right-[8%] h-64 w-64 rounded-full bg-[var(--theme-primary)] opacity-20 blur-3xl" />
          <div className="relative mx-auto max-w-[1240px] px-5 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
            <div className="max-w-3xl">
              <p className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-[var(--theme-secondary)]">{t(eyebrow)}</p>
              <h1 className="mt-5 max-w-3xl text-3xl font-black leading-[1.08] tracking-[-0.035em] sm:text-4xl lg:text-5xl">{t(title)}</h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">{t(introduction)}</p>
              <p className="mt-5 text-sm font-semibold text-slate-400">{storeName}</p>
            </div>
            {highlights.length > 0 ? (
              <dl className="mt-10 grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
                {highlights.map((highlight) => (
                  <div key={highlight.label} className="bg-slate-950/80 px-5 py-5">
                    <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{t(highlight.label)}</dt>
                    <dd className="mt-2 text-sm font-bold text-white">{t(highlight.value)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          {notice ? (
            <div className="mb-8 border-l-4 border-[var(--theme-primary)] bg-white px-5 py-4 text-sm leading-6 text-slate-600 shadow-sm">
              <strong className="mr-2 text-slate-950">{t("Please note:")}</strong>{t(notice)}
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            {sections.map((section, index) => (
              <article key={section.title} className="border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:p-8">
                <span className="font-mono text-[10px] font-black tracking-[0.18em] text-[var(--theme-primary)]">{String(index + 1).padStart(2, "0")}</span>
                <h2 className="mt-4 text-xl font-black tracking-[-0.025em] sm:text-2xl">{t(section.title)}</h2>
                <p className="mt-3 leading-7 text-slate-600">{t(section.description)}</p>
                {section.items?.length ? (
                  <ul className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--theme-primary)]" aria-hidden="true" />
                        <span>{t(item)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 pb-14 sm:px-8 lg:px-10 lg:pb-20">
          <div className="relative overflow-hidden bg-slate-950 px-6 py-9 text-white sm:px-9 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-12">
            <div className="absolute bottom-0 right-0 h-full w-40 bg-[var(--theme-primary)] opacity-20 [clip-path:polygon(55%_0,100%_0,100%_100%,0_100%)]" />
            <div className="relative max-w-2xl">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-secondary)]">{t("Need more help?")}</p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] sm:text-3xl">{t("Continue shopping or speak with our buyer support team.")}</h2>
            </div>
            <div className="relative mt-7 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
              <Link href={primaryAction.href} className="bg-[var(--theme-primary)] px-5 py-3.5 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:brightness-110">{t(primaryAction.label)}</Link>
              <Link href={secondaryAction.href} className="border border-white/30 px-5 py-3.5 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:border-white hover:bg-white/10">{t(secondaryAction.label)}</Link>
            </div>
          </div>
        </section>
      </main>
    </StorefrontLocaleFrame>
  );
}
