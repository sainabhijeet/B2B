import Link from "next/link";
import Image from "next/image";
import { translate } from "@/lib/translation-engine";

type Props = {
  slug: string;
  name: string;
  description: string;
  image?: string;
  languageCode?: string;
};

export default function CategoryCard({ slug, name, description, image, languageCode }: Props) {
  const browseLabel = translate("Browse category", languageCode);
  return (
    <article
      className="overflow-hidden rounded-xl border shadow-sm transition hover:shadow-md"
      style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
    >
      {image ? (
        <div className="relative h-44 w-full">
          <Image src={image} alt={name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" unoptimized />
        </div>
      ) : null}
      <div className="p-5">
        <h2 className="text-lg font-semibold" style={{ color: "var(--theme-text)" }}>
          <Link href={`/category/${slug}`} className="hover:underline">
            {name}
          </Link>
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--theme-muted)" }}>
          {description}
        </p>
        <Link
          href={`/category/${slug}`}
          className="mt-4 inline-block text-sm font-medium hover:underline"
          style={{ color: "var(--theme-primary)" }}
        >
          {browseLabel} →
        </Link>
      </div>
    </article>
  );
}
