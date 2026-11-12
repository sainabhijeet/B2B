"use client";

import { useState } from "react";
import Link from "next/link";

type CategoryMenuEntry = {
  label: string;
  href: string;
  description: string;
};

type Props = {
  label: string;
  href: string;
  active?: boolean;
  title: string;
  subtitle: string;
  viewAllLabel: string;
  entries: CategoryMenuEntry[];
  emptyLabel: string;
};

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
    </svg>
  );
}

export default function StorefrontCategoryMenu({
  label,
  href,
  active = false,
  title,
  subtitle,
  viewAllLabel,
  entries,
  emptyLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div
      className="storefront-category-menu relative flex shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        close();
        (event.currentTarget.querySelector("a") as HTMLAnchorElement | null)?.focus();
      }}
    >
      <Link
        href={href}
        onClick={close}
        data-active={active ? "true" : "false"}
        className={`group/link relative flex shrink-0 items-center gap-2 px-1 text-xs font-bold transition ${active ? "text-[var(--header-primary)]" : "text-slate-800 hover:text-[var(--header-primary)]"}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {label} <ChevronDownIcon />
        <span className={`absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-[var(--header-primary)] transition-transform ${active ? "scale-x-100" : "scale-x-0 group-hover/link:scale-x-100"}`} aria-hidden="true" />
      </Link>

      <div className={`storefront-category-panel absolute left-1/2 top-[calc(100%-1px)] z-[180] w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl transition duration-200 ${open ? "pointer-events-auto visible translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-2 opacity-0"}`}>
        <div className="storefront-category-panel-heading flex items-end justify-between gap-4 border-b border-slate-100 px-2 pb-3">
          <div>
            <strong className="block text-sm font-extrabold text-slate-950">{title}</strong>
            <span className="mt-1 block text-xs font-medium text-slate-500">{subtitle}</span>
          </div>
          <Link href="/category" onClick={close} className="storefront-category-view-all text-xs font-bold text-[var(--header-primary)] hover:underline">
            {viewAllLabel} &#8599;
          </Link>
        </div>
        <div className="storefront-category-panel-grid mt-2 grid max-h-[420px] grid-cols-1 gap-1 overflow-y-auto overscroll-contain pr-1">
          {entries.map((entry, entryIndex) => (
            <Link key={`${entry.href}-${entryIndex}`} href={entry.href} onClick={close} className="storefront-category-panel-link group/card flex min-w-0 items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50">
              <span className="storefront-category-panel-number flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--header-soft)] text-[11px] font-black text-[var(--header-primary)]">
                {String(entryIndex + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[13px] font-extrabold text-slate-900">{entry.label}</strong>
                <small className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">{entry.description}</small>
              </span>
              <span className="text-sm text-slate-400 transition group-hover/card:translate-x-0.5 group-hover/card:text-[var(--header-primary)]" aria-hidden="true">&#8599;</span>
            </Link>
          ))}
          {entries.length === 0 ? (
            <Link href="/category" onClick={close} className="storefront-category-panel-link rounded-xl bg-slate-50 px-4 py-4 text-center text-sm font-bold text-slate-900 hover:text-[var(--header-primary)]">
              {emptyLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
