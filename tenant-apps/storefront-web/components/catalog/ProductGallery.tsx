"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Props = {
  images: { id: string; url: string }[];
  productName: string;
};

type ZoomPoint = { visible: boolean; x: number; y: number };

export default function ProductGallery({ images, productName }: Props) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState<ZoomPoint>({ visible: false, x: 50, y: 50 });
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
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Product images">
      {images.map((image, index) => (
        <button
          key={image.id}
          type="button"
          onClick={() => setActive(index)}
          onMouseEnter={() => setActive(index)}
          aria-label={`View image ${index + 1} of ${images.length}`}
          aria-pressed={active === index}
          className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-white p-1 transition sm:h-[72px] sm:w-[72px] ${active === index ? "border-[var(--theme-primary)] shadow-sm" : "border-slate-200 hover:border-slate-500"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="h-full w-full object-contain" />
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative min-w-0">
      <div className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {selected ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            onMouseEnter={() => setZoom((current) => ({ ...current, visible: true }))}
            onMouseLeave={() => setZoom((current) => ({ ...current, visible: false }))}
            onMouseMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = Math.min(84, Math.max(16, ((event.clientX - bounds.left) / bounds.width) * 100));
              const y = Math.min(84, Math.max(16, ((event.clientY - bounds.top) / bounds.height) * 100));
              setZoom({ visible: true, x, y });
            }}
            className="flex h-full w-full cursor-crosshair items-center justify-center"
            aria-label={`Zoom ${productName} image ${active + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.url} alt={`${productName} - image ${active + 1}`} className="h-full w-full object-contain" />
            {zoom.visible ? (
              <span
                className="pointer-events-none absolute hidden aspect-square w-[32%] -translate-x-1/2 -translate-y-1/2 border border-sky-400 bg-sky-100/35 lg:block"
                style={{ left: `${zoom.x}%`, top: `${zoom.y}%` }}
                aria-hidden="true"
              />
            ) : null}
          </button>
        ) : (
          <span className="text-sm text-slate-400">No image available</span>
        )}

      </div>

      {selected && zoom.visible ? (
        <div
          className="pointer-events-none absolute left-[calc(100%+1rem)] top-0 z-50 hidden h-[min(680px,72vh)] w-[min(760px,48vw)] border border-slate-300 bg-white bg-no-repeat shadow-2xl lg:block"
          style={{
            backgroundImage: `url(${JSON.stringify(selected.url)})`,
            backgroundPosition: `${zoom.x}% ${zoom.y}%`,
            backgroundSize: "240% 240%",
          }}
          aria-hidden="true"
        />
      ) : null}

      {selected ? (
        <p className="mt-2 text-center text-xs text-sky-700">
          <span className="hidden lg:inline">Roll over image to zoom · </span>Click to see full view
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
