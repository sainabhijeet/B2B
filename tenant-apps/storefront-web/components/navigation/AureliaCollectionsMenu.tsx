"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

type CollectionLink = {
  label: string;
  href: string;
};

type Props = {
  label: string;
  menuLabel: string;
  title: string;
  links: CollectionLink[];
  active?: boolean;
};

export default function AureliaCollectionsMenu({ label, menuLabel, title, links, active = false }: Props) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const closeMenu = useCallback(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, []);

  useEffect(() => {
    closeMenu();
  }, [closeMenu, pathname]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!detailsRef.current?.contains(event.target as Node)) closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeMenu();
      detailsRef.current?.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu]);

  return (
    <details ref={detailsRef} className="aurelia-nav-dropdown group relative flex items-stretch" onMouseLeave={closeMenu}>
      <summary className={`aurelia-nav-trigger group relative flex shrink-0 cursor-pointer list-none items-center gap-2 px-1 text-xs font-bold transition marker:hidden ${active ? "text-[var(--header-primary)]" : "text-slate-800 hover:text-[var(--header-primary)]"}`} aria-haspopup="menu">
        {label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m7 10 5 5 5-5" />
        </svg>
        <span className={`absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-[var(--header-primary)] transition-transform ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} aria-hidden="true" />
      </summary>
      <div className="aurelia-nav-panel" aria-label={menuLabel} role="menu">
        <p>{title}</p>
        {links.map((entry, index) => (
          <Link key={entry.href} href={entry.href} role="menuitem" onClick={closeMenu}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {entry.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
