"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Props = {
  images: { id: string; url: string }[];
  productName: string;
};

export default function ProductGallery({ images, productName }: Props) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const selected = images[active] ?? images[0];

  const showPrevious = useCallback(() => {
    setActive((current) => (current - 1 + images.length) % images.length);
  }, [images.length]);
  const showNext = useCallback(() => {
    setActive((current) => (current + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (active >= images.length) setActive(0);
  }, [active, images.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft" && images.length > 1) showPrevious();
      if (event.key === "ArrowRight" && images.length > 1) showNext();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [images.length, lightboxOpen, showNext, showPrevious]);

  const thumbnails = (
    <div className="flex gap-3 overflow-x-auto pb-2" aria-label="Product images">
      {images.map((image, index) => (
        <button
          key={image.id}
          type="button"
          onClick={() => setActive(index)}
          onMouseEnter={() => setActive(index)}
          aria-label={`View image ${index + 1} of ${images.length}`}
          aria-pressed={active === index}
          className={`h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border bg-white p-1.5 transition sm:h-20 sm:w-20 ${active === index ? "border-[var(--theme-primary)] shadow-[0_8px_22px_rgba(15,23,42,0.12)] ring-2 ring-[var(--theme-primary)]/10" : "border-slate-200 opacity-75 hover:border-slate-400 hover:opacity-100"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="h-full w-full object-contain" />
        </button>
      ))}
    </div>
  );

  return (
    <div className="pdp-gallery relative min-w-0">
      <div className="pdp-gallery-stage group relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(145deg,#ffffff,#f3f7f6)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-10">
        {selected ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="flex h-full w-full cursor-zoom-in items-center justify-center"
            aria-label={`Zoom ${productName} image ${active + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.url} alt={`${productName} - image ${active + 1}`} className="h-full w-full object-contain transition duration-700 ease-out group-hover:scale-[1.025]" />
          </button>
        ) : (
          <span className="text-sm text-slate-400">No image available</span>
        )}
        {selected ? (
          <span className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-700 shadow-sm backdrop-blur-sm">
            {active + 1} / {images.length}
          </span>
        ) : null}
      </div>

      {selected ? (
        <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Click image to open full-screen view
        </p>
      ) : null}
      {images.length > 1 ? <div className="mt-3">{thumbnails}</div> : null}

      {lightboxOpen && selected ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`${productName} image gallery`} onClick={() => setLightboxOpen(false)}>
          <button type="button" onClick={() => setLightboxOpen(false)} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20" aria-label="Close image gallery">
            <X className="h-6 w-6" />
          </button>
          <div className="flex min-h-0 flex-1 items-center justify-center px-8 py-10" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.url} alt={`${productName} - image ${active + 1}`} className="max-h-full max-w-full object-contain" />
            {images.length > 1 ? (
              <>
                <button type="button" onClick={showPrevious} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:left-6" aria-label="Previous product image">
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button type="button" onClick={showNext} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:right-6" aria-label="Next product image">
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            ) : null}
          </div>
          {images.length > 1 ? (
            <div className="mx-auto flex max-w-full gap-2 overflow-x-auto pb-1" onClick={(event) => event.stopPropagation()}>
              {images.map((image, index) => (
                <button
                  key={`lightbox-${image.id}`}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white p-1 ${active === index ? "border-[var(--theme-primary)]" : "border-transparent opacity-70 hover:opacity-100"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          ) : null}
          <p className="mt-2 text-center text-xs text-white/70">{active + 1} / {images.length}</p>
        </div>
      ) : null}
    </div>
  );
}
