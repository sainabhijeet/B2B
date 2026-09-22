import Link from "next/link";
import Image from "next/image";
import { translate } from "@/lib/translation-engine";
import { formatCurrency } from "@/lib/language-consistency";
import WishlistButton from "@/components/wishlist/WishlistButton";

type Props = {
  id?: string;
  slug: string;
  name: string;
  price: number | null;
  currency?: string;
  image?: string;
  languageCode?: string;
};

export default function ProductCard({ id, slug, name, price, currency = "INR", image, languageCode }: Props) {
  return (
    <article
      className="relative flex flex-col overflow-hidden rounded-xl border shadow-sm transition hover:shadow-md"
      style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
    >
      {id ? <div className="absolute right-3 top-3 z-10"><WishlistButton productId={id} languageCode={languageCode} compact /></div> : null}
      {image ? (
        <div className="relative aspect-square w-full">
          <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="aspect-square" style={{ background: "color-mix(in srgb, var(--theme-secondary) 24%, white)" }} aria-hidden />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/product/${slug}`} className="font-semibold hover:underline" style={{ color: "var(--theme-text)" }}>
          {name}
        </Link>
        <p className="text-sm" style={{ color: "var(--theme-primary)" }}>
          {price == null ? translate("Sign in to see price", languageCode) : formatCurrency(price, languageCode, currency)}
        </p>
        <Link
          href={`/product/${slug}`}
          className="mt-auto inline-block rounded-lg px-3 py-1.5 text-center text-sm font-semibold hover:opacity-90"
          style={{ background: "var(--theme-primary)", color: "var(--theme-primary-contrast)" }}
        >
          {translate("View", languageCode)}
        </Link>
      </div>
    </article>
  );
}
