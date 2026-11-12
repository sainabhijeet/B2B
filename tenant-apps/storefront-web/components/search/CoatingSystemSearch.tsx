"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { translate } from "@/lib/translation-engine";

type SearchSuggestion = {
  label: string;
  description: string;
  href: string;
};

type Props = {
  languageCode?: string;
  suggestions?: SearchSuggestion[];
};

const FALLBACK_SUGGESTIONS: SearchSuggestion[] = [
  { label: "Interior wall paints", description: "Emulsions and washable finishes", href: "/search?q=interior%20wall%20paint" },
  { label: "Exterior weather coatings", description: "UV and rain-resistant systems", href: "/search?q=exterior%20weather%20coating" },
  { label: "Metal protection", description: "Anti-corrosion primers and topcoats", href: "/search?q=metal%20protection" },
  { label: "Wood finishes", description: "Clear coats, stains and polishes", href: "/search?q=wood%20finish" },
  { label: "Adhesives and sealants", description: "Bonding and joint-sealing solutions", href: "/search?q=adhesives%20sealants" },
];

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="m16 16 4 4" />
    </svg>
  );
}

export default function CoatingSystemSearch({ languageCode, suggestions = [] }: Props) {
  const t = (value: string) => translate(value, languageCode);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLFormElement>(null);
  const suggestionId = "chroma-spec-search-suggestions";
  const source = suggestions.length > 0 ? suggestions.slice(0, 8) : FALLBACK_SUGGESTIONS;
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return source.slice(0, 5);
    return source
      .filter((item) => `${item.label} ${item.description}`.toLocaleLowerCase().includes(term))
      .slice(0, 5);
  }, [query, source]);

  const closeWhenFocusLeaves = (event: FocusEvent<HTMLFormElement>) => {
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
  };

  const handleKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      event.currentTarget.blur();
    }
    if (event.key === "ArrowDown" && open) {
      event.preventDefault();
      rootRef.current?.querySelector<HTMLAnchorElement>(".chroma-spec-suggestion-link")?.focus();
    }
  };

  const searchHref = query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/category";

  return (
    <form
      ref={rootRef}
      action="/search"
      role="search"
      className="chroma-spec-search"
      autoComplete="off"
      onFocus={() => setOpen(true)}
      onBlur={closeWhenFocusLeaves}
      onSubmit={() => setOpen(false)}
    >
      <label htmlFor="chroma-spec-search-input" className="sr-only">{t("Search coating systems")}</label>
      <span className="chroma-spec-search-icon" aria-hidden="true"><SearchGlyph /></span>
      <input
        id="chroma-spec-search-input"
        name="q"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeys}
        placeholder={t("Search by product, surface or application")}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={suggestionId}
        aria-expanded={open}
      />
      <button type="submit"><span>{t("Search products")}</span><b aria-hidden="true">&#8594;</b></button>

      {open ? (
        <div id={suggestionId} className="chroma-spec-search-suggestions" role="listbox" aria-label={t("Suggested searches")}>
          <div className="chroma-spec-suggestion-heading">
            <span>{t(query.trim() ? "Matching categories" : "Popular coating searches")}</span>
            <small>{t("Select a category or continue typing")}</small>
          </div>
          <div className="chroma-spec-suggestion-list">
            {filtered.map((item, index) => (
              <Link key={`${item.href}-${index}`} href={item.href} className="chroma-spec-suggestion-link" role="option" aria-selected="false" onClick={() => setOpen(false)}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <strong>{t(item.label)}</strong>
                <small>{t(item.description)}</small>
                <b aria-hidden="true">&#8599;</b>
              </Link>
            ))}
            {filtered.length === 0 ? (
              <Link href={searchHref} className="chroma-spec-suggestion-empty" onClick={() => setOpen(false)}>
                <strong>{t("Search the complete catalog")}</strong>
                <small>{query.trim()}</small>
                <span aria-hidden="true">&#8594;</span>
              </Link>
            ) : null}
          </div>
          <Link href={searchHref} className="chroma-spec-suggestion-footer" onClick={() => setOpen(false)}>
            <span>{query.trim() ? `${t("View all results for")} “${query.trim()}”` : t("Browse the complete catalog")}</span>
            <b aria-hidden="true">&#8594;</b>
          </Link>
        </div>
      ) : null}
    </form>
  );
}
