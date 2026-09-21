type Props = {
  src?: string;
  url?: string;
  alt?: string;
  rounded?: string | boolean;
};

export default function ImageBlock({ src, url, alt, rounded }: Props) {
  const s = (src || url || "").trim();
  const r = rounded === true || String(rounded).toLowerCase() === "true";
  if (!s) return <div className={`h-48 max-w-xl bg-slate-100 ${r ? "rounded-2xl" : ""}`} />;
  return <img src={s} alt={alt?.trim() || ""} className={`max-h-96 w-full max-w-xl object-cover shadow-sm ${r ? "rounded-2xl" : ""}`} />;
}
