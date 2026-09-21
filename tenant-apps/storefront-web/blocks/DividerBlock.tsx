type Props = {
  style?: string;
};

export default function DividerBlock({ style }: Props) {
  const s = (style || "solid").toLowerCase();
  const border =
    s === "dashed" ? "border-dashed" : s === "dotted" ? "border-dotted" : "border-solid";
  return <hr className={`my-2 w-full border-0 border-t ${border} border-slate-200`} />;
}
