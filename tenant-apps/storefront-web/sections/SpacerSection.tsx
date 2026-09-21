import type { ThemeKey } from "@/lib/theme-config";

type Props = {
  themeKey?: ThemeKey;
  height?: number | string;
};

export default function SpacerSection({ height }: Props) {
  const h =
    typeof height === "number" && Number.isFinite(height) && height > 0
      ? Math.min(height, 320)
      : typeof height === "string" && /^\d+px$/u.test(height.trim())
        ? height.trim()
        : "48px";
  return <div style={{ height: typeof h === "number" ? `${h}px` : h }} aria-hidden className="w-full" />;
}
