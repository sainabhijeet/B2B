import type { ThemeKey } from "@/lib/theme-config";

type Props = {
  themeKey?: ThemeKey;
  gallery?: unknown;
};

function normalizeGallery(gallery: unknown): string[] {
  if (!Array.isArray(gallery)) return [];
  return gallery.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export default function ProductGallerySection({ gallery: galleryRaw }: Props) {
  const gallery = normalizeGallery(galleryRaw);
  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      {gallery.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((src, i) => (
            <img key={i} src={src} alt="" className="aspect-square w-full rounded-xl object-cover shadow-sm" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="aspect-square rounded-xl bg-slate-100" />
          <div className="aspect-square rounded-xl bg-slate-100" />
        </div>
      )}
    </section>
  );
}
