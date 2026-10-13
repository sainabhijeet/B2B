type Props = {
  message?: string;
};

export default function StorefrontLoadingOverlay({ message = "Loading page…" }: Props) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/10 px-4 backdrop-blur-[3px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <span
        className="relative block h-14 w-14 rounded-full drop-shadow-lg"
        aria-hidden="true"
      >
        <span className="absolute inset-0 rounded-full border-[5px] border-white/80" />
        <span
          className="absolute inset-0 animate-spin rounded-full border-[5px] border-transparent border-t-current border-r-current"
          style={{ color: "var(--theme-primary)" }}
        />
      </span>
    </div>
  );
}
