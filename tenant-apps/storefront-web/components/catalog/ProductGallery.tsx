"use client";

import { useState } from "react";

type Props = {
  images: { id: string; url: string }[];
  productName: string;
};

export default function ProductGallery({ images, productName }: Props) {
  const [active, setActive] = useState(0);
  const selected = images[active] ?? images[0];

  return (
    <div className="min-w-0">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.url} alt={productName} className="h-full w-full object-contain" />
        ) : (
          <span className="text-sm text-slate-400">No image available</span>
        )}
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Product images">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1}`}
              aria-pressed={active === index}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-white p-1 ${active === index ? "border-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]/20" : "border-slate-200 hover:border-slate-400"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
