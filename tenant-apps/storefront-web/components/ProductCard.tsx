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
  const productHref = `/product/${encodeURIComponent(slug)}`;
  return (
    <article
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
    >
      {id ? <div className="absolute right-3 top-3 z-20"><WishlistButton productId={id} languageCode={languageCode} compact /></div> : null}
      <Link
        href={productHref}
        aria-label={`${translate("View", languageCode)} ${name}`}
        className="flex h-full flex-1 flex-col rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-primary)]"
      >
        {image ? (
          <div className="relative aspect-square w-full overflow-hidden">
            <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition duration-300 group-hover:scale-[1.02]" unoptimized />
          </div>
        ) : (
          <div className="aspect-square" style={{ background: "color-mix(in srgb, var(--theme-secondary) 24%, white)" }} aria-hidden />
        )}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="font-semibold group-hover:underline" style={{ color: "var(--theme-text)" }}>
            {name}
          </h3>
          <p className="mt-auto text-sm" style={{ color: "var(--theme-primary)" }}>
            {price == null ? translate("Sign in to see price", languageCode) : formatCurrency(price, languageCode, currency)}
          </p>
        </div>
      </Link>
    </article>
  );
}
