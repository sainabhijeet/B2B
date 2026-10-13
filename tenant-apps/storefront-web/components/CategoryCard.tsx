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
      className="group overflow-hidden rounded-2xl border shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
    >
      {image ? (
        <Link
          href={`/category/${slug}`}
          className="relative block h-44 w-full overflow-hidden border-b bg-white sm:h-48"
          style={{ borderColor: "var(--theme-border)" }}
          aria-label={name}
        >
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            unoptimized
          />
        </Link>
      ) : null}
      <div className="p-5">
        <h2 className="text-lg font-semibold" style={{ color: "var(--theme-text)" }}>
          <Link href={`/category/${slug}`} className="hover:underline">
            {name}
          </Link>
        </h2>
        {description ? (
          <p className="mt-2 line-clamp-2 text-sm" style={{ color: "var(--theme-muted)" }}>
            {description}
          </p>
        ) : null}
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
