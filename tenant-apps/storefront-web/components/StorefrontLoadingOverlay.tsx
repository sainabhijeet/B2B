type Props = {
  message?: string;
};

export default function StorefrontLoadingOverlay({ message = "Loading page…" }: Props) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-1 overflow-hidden bg-slate-200/60"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <span
        className="block h-full w-full animate-pulse shadow-[0_1px_8px_currentColor]"
        style={{ color: "var(--theme-primary)", backgroundColor: "var(--theme-primary)" }}
        aria-hidden="true"
      />
      <span className="sr-only">{message}</span>
    </div>
  );
}
