"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  sectionId: string;
  eyebrow: string;
  heading: string;
  subtitle: string;
  viewAllLabel: string;
  previousLabel: string;
  nextLabel: string;
  children: ReactNode;
};

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

export default function ProductCarouselRail({
  sectionId,
  eyebrow,
  heading,
  subtitle,
  viewAllLabel,
  previousLabel,
  nextLabel,
  children,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(true);

  const updateControls = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setCanGoBack(rail.scrollLeft > 4);
    setCanGoForward(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateControls();
    const rail = railRef.current;
    if (!rail) return;
    const observer = new ResizeObserver(updateControls);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [updateControls]);

  const move = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(260, rail.clientWidth * 0.72), behavior: "smooth" });
  };

  return (
    <section id={sectionId} className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16" aria-labelledby={`${sectionId}-heading`}>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-[color:var(--theme-primary)] opacity-[0.055] blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-[color:var(--theme-secondary)] opacity-10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-7 items-center gap-2 rounded-full bg-[color:var(--theme-primary)]/10 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-primary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--theme-primary)]" />
                {eyebrow}
              </span>
              <span className="h-px w-12 bg-[var(--theme-primary)]/30" aria-hidden="true" />
            </div>
            <h2 id={`${sectionId}-heading`} className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-[2rem]">
              {heading}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-[15px]">{subtitle}</p>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <Link href="/category" className="mr-1 inline-flex h-10 items-center rounded-full px-4 text-xs font-extrabold text-[var(--theme-primary)] transition hover:bg-[color:var(--theme-primary)]/10">
              {viewAllLabel}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1.5 h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={() => move(-1)}
              disabled={!canGoBack}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
              aria-label={previousLabel}
            >
              <ArrowIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              disabled={!canGoForward}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--theme-primary)] text-white shadow-[0_8px_22px_color-mix(in_srgb,var(--theme-primary)_28%,transparent)] transition hover:-translate-y-0.5 hover:brightness-95 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
              aria-label={nextLabel}
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
        </div>

        <div className="relative mt-8">
          <div
            ref={railRef}
            onScroll={updateControls}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-5"
            aria-label={heading}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
