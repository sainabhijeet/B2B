"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";

export type UniversalSearchSuggestion = {
  label: string;
  description: string;
  href: string;
};

type Props = {
  inputId: string;
  outerClassName: string;
  placeholder: string;
  searchLabel: string;
  buttonLabel: string;
  suggestions: UniversalSearchSuggestion[];
  heading: string;
  hint: string;
  footerLabel: string;
  emptyLabel: string;
  layout?: "standard" | "quarry";
  mobile?: boolean;
  compactLuxury?: boolean;
  showCategory?: boolean;
  categoryLabel?: string;
  allCategoriesLabel?: string;
  industryName?: string;
};

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m7 10 5 5 5-5" />
    </svg>
  );
}

export default function UniversalHeaderSearch({
  inputId,
  outerClassName,
  placeholder,
  searchLabel,
  buttonLabel,
  suggestions,
  heading,
  hint,
  footerLabel,
  emptyLabel,
  layout = "standard",
  mobile = false,
  compactLuxury = false,
  showCategory = false,
  categoryLabel = "Category",
  allCategoriesLabel = "All Categories",
  industryName,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLFormElement>(null);
  const listId = `${inputId}-suggestions`;
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return suggestions.slice(0, 5);
    return suggestions
      .filter((item) => `${item.label} ${item.description}`.toLocaleLowerCase().includes(term))
      .slice(0, 5);
  }, [query, suggestions]);

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
      rootRef.current?.querySelector<HTMLAnchorElement>(".universal-search-suggestion")?.focus();
    }
  };

  const searchHref = query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/category";
  const input = (
    <input
      id={inputId}
      name="q"
      type="search"
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      onKeyDown={handleKeys}
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="search"
      role="combobox"
      aria-autocomplete="list"
      aria-controls={listId}
      aria-expanded={open}
      className={layout === "standard" ? "min-w-0 flex-1 bg-transparent px-5 text-[13px] font-medium text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 sm:px-6" : undefined}
    />
  );

  return (
    <form
      ref={rootRef}
      action="/search"
      role="search"
      className={`${outerClassName} universal-search-host`}
      autoComplete="off"
      onFocus={() => setOpen(true)}
      onBlur={closeWhenFocusLeaves}
      onSubmit={() => setOpen(false)}
    >
      <label htmlFor={inputId} className="sr-only">{searchLabel}</label>

      {layout === "quarry" ? (
        <div className="quarry-pro-search-field">
          <span className="quarry-pro-search-icon" aria-hidden="true"><SearchGlyph /></span>
          {input}
          <button type="submit">{buttonLabel}</button>
        </div>
      ) : (
        <div className="flex h-[52px] w-full items-stretch overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition focus-within:border-[var(--header-primary)] focus-within:ring-4 focus-within:ring-[color:var(--header-primary)]/10">
          {input}
          {showCategory && !mobile && !compactLuxury ? (
            <label className="hidden h-full min-w-[155px] items-center border-l border-slate-200 px-5 text-xs font-semibold text-slate-700 lg:flex">
              <span className="sr-only">{categoryLabel}</span>
              <select name="category" defaultValue="" className="min-w-0 flex-1 appearance-none bg-transparent pr-2 outline-none">
                <option value="">{allCategoriesLabel}</option>
                {industryName ? <option value={industryName}>{industryName}</option> : null}
              </select>
              <ChevronDown />
            </label>
          ) : null}
          <button
            type="submit"
            className="flex w-[58px] shrink-0 items-center justify-center rounded-r-[27px] text-white transition hover:brightness-95 sm:w-[64px]"
            style={{ backgroundColor: "var(--header-primary)", color: "var(--theme-primary-contrast, #fff)" }}
            aria-label={buttonLabel}
          >
            <SearchGlyph />
          </button>
        </div>
      )}

      {open ? (
        <section id={listId} className="universal-search-suggestions" role="listbox" aria-label={heading}>
          <div className="universal-search-heading">
            <strong>{query.trim() ? searchLabel : heading}</strong>
            <small>{hint}</small>
          </div>
          <div className="universal-search-list">
            {filtered.map((item, index) => (
              <Link key={`${item.href}-${index}`} href={item.href} className="universal-search-suggestion" role="option" aria-selected="false" onClick={() => setOpen(false)}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
                <b aria-hidden="true">&#8599;</b>
              </Link>
            ))}
            {filtered.length === 0 ? (
              <Link href={searchHref} className="universal-search-empty" onClick={() => setOpen(false)}>
                <strong>{emptyLabel}</strong>
                <small>{query.trim()}</small>
                <span aria-hidden="true">&#8594;</span>
              </Link>
            ) : null}
          </div>
          <Link href={searchHref} className="universal-search-footer" onClick={() => setOpen(false)}>
            <span>{footerLabel}</span><b aria-hidden="true">&#8594;</b>
          </Link>
        </section>
      ) : null}
    </form>
  );
}
