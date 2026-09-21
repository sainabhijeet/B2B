type BadgeProps = {
  children: React.ReactNode;
  variant?: "neutral" | "success" | "warning" | "danger";
  className?: string;
};

const map: Record<NonNullable<BadgeProps["variant"]>, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-900 ring-amber-200",
  danger: "bg-red-50 text-red-800 ring-red-200",
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        map[variant],
        className ?? "",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
