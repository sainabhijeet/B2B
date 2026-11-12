import type { ThemeKey } from "@/lib/theme-config";

type Props = {
  themeKey?: ThemeKey;
  variant?: string;
  title?: string;
  quote?: string;
  author?: string;
  role?: string;
  image?: string;
  imageAlt?: string;
} & Record<string, unknown>;

export default function TestimonialCarousel({ title, quote, author, role, image, imageAlt }: Props) {
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-5xl px-4 text-center">
        {title?.trim() ? <h2 className="theme-testimonial-title">{title.trim()}</h2> : null}
        <div className="theme-testimonial-layout">
          {image?.trim() ? <img src={image.trim()} alt={imageAlt?.trim() || author?.trim() || "Client portrait"} className="theme-testimonial-image" /> : null}
          <div className="theme-testimonial-copy">
            <p className="text-2xl font-medium" style={{ color: "var(--theme-text)" }}>&ldquo;{quote?.trim()}&rdquo;</p>
            <p className="mt-4 text-sm" style={{ color: "var(--theme-muted)" }}>{author?.trim()}</p>
            {role?.trim() ? <p className="theme-testimonial-role">{role.trim()}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
