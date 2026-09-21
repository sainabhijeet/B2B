type Props = {
  height?: number | string;
};

export default function SpacerBlock({ height }: Props) {
  const h =
    typeof height === "number" && Number.isFinite(height)
      ? Math.max(0, Math.min(height, 240))
      : typeof height === "string" && /^\d+$/u.test(height.trim())
        ? Math.min(parseInt(height.trim(), 10), 240)
        : 24;
  return <div className="w-full shrink-0" style={{ height: h }} aria-hidden />;
}
