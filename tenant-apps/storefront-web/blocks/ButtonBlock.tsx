import { translateText } from "@/engine/template-language";

type Props = {
  text?: string;
  label?: string;
  href?: string;
  link?: string;
  /** Editor schema `button` uses `url`. */
  url?: string;
  variant?: string;
  languageCode?: string;
};

export default function ButtonBlock({ text, label, href, link, url, variant, languageCode }: Props) {
  const t = translateText((text || label || "Button").trim(), languageCode);
  const dest = (href || link || url || "#").trim() || "#";
  const v = (variant || "primary").toLowerCase();
  const secondary = v === "secondary";
  return (
    <a
      href={dest}
      className="inline-flex rounded-full border px-5 py-2 text-sm font-semibold shadow-sm hover:opacity-90"
      style={
        secondary
          ? {
              background: "var(--theme-surface)",
              borderColor: "var(--theme-border)",
              color: "var(--theme-primary)",
            }
          : {
              background: "var(--theme-primary)",
              borderColor: "var(--theme-primary)",
              color: "var(--theme-primary-contrast)",
            }
      }
    >
      {t}
    </a>
  );
}
