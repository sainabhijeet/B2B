import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  designId?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  image?: string;
  accentImage?: string;
  accentImageAlt?: string;
  primaryCta?: string;
  primaryHref?: string;
  secondaryCta?: string;
  secondaryHref?: string;
  languageCode?: string;
  variant?: string;
};

export default function HeroBanner({
  themeKey,
  designId,
  eyebrow,
  title,
  subtitle,
  image,
  accentImage,
  accentImageAlt,
  primaryCta,
  primaryHref,
  secondaryCta,
  secondaryHref,
  languageCode,
  variant,
}: Props) {
  const t = (text: string) => translate(text, languageCode);
  const heading = t(title?.trim() ?? "");
  const sub = t(subtitle?.trim() ?? "");
  const eyebrowText = eyebrow?.trim() ?? "";
  const isFootwearEditorial = designId === "ds-02-web";
  const isClinicalDossier = designId === "ds-11-web" || variant === "hero-clinical-dossier";
  const isFieldHorizon = designId === "ds-13-web" || variant === "hero-field-horizon";
  const isMaterialShowcase = variant === "hero-material-finder";
  const isPolymerExchange = designId === "ds-17-web";
  const showEyebrow = Boolean(eyebrowText)
    && !/^b2b\s+(?:web|app|mobile)\s+commerce$/iu.test(eyebrowText);
  return (
    <section
      className={`overflow-hidden py-14 md:py-16 ${isClinicalDossier ? "clinical-dossier-hero" : ""}`}
      style={{
        background:
          "linear-gradient(135deg, var(--theme-surface), color-mix(in srgb, var(--theme-secondary) 42%, white))",
      }}
      data-theme-key={themeKey}
      data-theme-design={designId}
      data-hero-variant={variant ?? "default"}
    >
      <div className="theme-hero-layout mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[minmax(0,0.95fr)_minmax(280px,1.05fr)] md:items-center lg:gap-12">
        <div className="theme-hero-content min-w-0 max-w-2xl">
          {isClinicalDossier ? (
            <div className="clinical-dossier-register" aria-label={t("Catalog reference")}>
              <span>MEDICAL / TRADE</span>
              <span>{t("Buyer catalog")}</span>
            </div>
          ) : null}
          {showEyebrow ? (
            <p className="theme-hero-eyebrow text-xs uppercase tracking-[0.16em]" style={{ color: "var(--theme-primary)" }}>
              {t(eyebrowText)}
            </p>
          ) : null}
          <h1
            className="theme-hero-title mt-3 max-w-[11ch] break-words text-4xl font-semibold leading-[0.98] sm:max-w-[14ch] sm:text-5xl lg:text-6xl"
            style={{ color: "var(--theme-text)" }}
          >
            {heading}
          </h1>
          <p className="theme-hero-description mt-5 max-w-xl text-base leading-7" style={{ color: "var(--theme-muted)" }}>
            {sub}
          </p>
          {isPolymerExchange ? (
            <dl className="polymer-hero-specs" aria-label={t("Polymer sourcing reference") }>
              <div><dt>{t("Material families")}</dt><dd>PP / PE / ABS / PET</dd></div>
              <div><dt>{t("Commercial form")}</dt><dd>{t("Resin / compound / masterbatch")}</dd></div>
              <div><dt>{t("Sourcing path")}</dt><dd>{t("Sample / MOQ / bulk")}</dd></div>
            </dl>
          ) : null}
          {isMaterialShowcase ? (
            <dl className="material-hero-facts" aria-label={t("Material sourcing steps")}>
              <div><dt>01 / {t("Material")}</dt><dd>{t("Match grade & application")}</dd></div>
              <div><dt>02 / {t("Pack")}</dt><dd>{t("Sample, drum or IBC")}</dd></div>
              <div><dt>03 / {t("Quantity")}</dt><dd>{t("Plan MOQ & volume tiers")}</dd></div>
            </dl>
          ) : null}
          {primaryCta?.trim() || secondaryCta?.trim() ? (
            <div className="theme-hero-actions mt-7 flex flex-wrap gap-3">
              {primaryCta?.trim() ? (
                <a
                  href={primaryHref?.trim() || "/category"}
                  className="theme-hero-primary-cta rounded-full px-5 py-2.5 text-sm font-semibold"
                  style={{ background: "var(--theme-primary)", color: "var(--theme-primary-contrast)" }}
                >
                  {t(primaryCta.trim())}
                </a>
              ) : null}
              {secondaryCta?.trim() ? (
                <a
                  href={secondaryHref?.trim() || "/category"}
                  className="theme-hero-secondary-cta rounded-full border px-5 py-2.5 text-sm font-semibold"
                  style={{ borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                >
                  {t(secondaryCta.trim())}
                </a>
              ) : null}
            </div>
          ) : null}
          {isClinicalDossier ? (
            <dl className="clinical-dossier-facts">
              <div><dd>{t("Compare equipment")}</dd></div>
              <div><dd>{t("Review quantity tiers")}</dd></div>
              <div><dd>{t("Build a sourcing list")}</dd></div>
            </dl>
          ) : null}
          {isFieldHorizon ? (
            <dl className="field-horizon-hero-facts" aria-label={t("Catalog focus areas")}>
              <div><dt>01</dt><dd>{t("Seeds & planting")}</dd></div>
              <div><dt>02</dt><dd>{t("Crop nutrition")}</dd></div>
              <div><dt>03</dt><dd>{t("Crop care & equipment")}</dd></div>
            </dl>
          ) : null}
        </div>
        <div className="theme-hero-media min-w-0">
          {image ? (
            <>
              <img src={image} alt="" className="aurelia-hero-main-image h-64 w-full rounded-lg object-cover shadow-sm sm:h-72" />
              {(variant === "hero-jowenly-campaign" || isFootwearEditorial) && accentImage ? (
                <img src={accentImage} alt={accentImageAlt?.trim() || ""} className="aurelia-hero-accent" />
              ) : null}
            </>
          ) : (
            <div
              className="h-64 rounded-lg shadow-sm sm:h-72"
              style={{ background: "color-mix(in srgb, var(--theme-surface) 78%, white)" }}
            />
          )}
          {isPolymerExchange ? (
            <div className="polymer-hero-media-register" aria-hidden="true">
              <span>SPEC / 01</span>
              <strong>{t("Polymer resin")}</strong>
              <small>{t("Demo material visual")}</small>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
