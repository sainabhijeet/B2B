import type { ThemeKey } from "@/lib/theme-config";

type Props = {
  themeKey?: ThemeKey;
  variant?: string;
  quote?: string;
  author?: string;
} & Record<string, unknown>;

export default function TestimonialCarousel({ quote, author }: Props) {
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <p className="text-2xl font-medium" style={{ color: "var(--theme-text)" }}>&ldquo;{quote?.trim()}&rdquo;</p>
        <p className="mt-4 text-sm" style={{ color: "var(--theme-muted)" }}>{author?.trim()}</p>
      </div>
    </section>
  );
}
