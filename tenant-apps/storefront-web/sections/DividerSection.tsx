import type { ThemeKey } from "@/lib/theme-config";

type Props = {
  themeKey?: ThemeKey;
  style?: string;
};

export default function DividerSection({ style: styleHint }: Props) {
  const dashed = String(styleHint || "").toLowerCase().includes("dashed");
  return (
    <div className="mx-auto max-w-6xl px-4 py-2">
      <hr className={`border-0 ${dashed ? "border-t border-dashed border-slate-200" : "h-px bg-slate-200"}`} />
    </div>
  );
}
