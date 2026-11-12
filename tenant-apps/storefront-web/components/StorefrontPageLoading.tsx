import StorefrontLoadingOverlay from "@/components/StorefrontLoadingOverlay";

type Props = {
  message?: string;
};

/** Keeps page height stable while a route loads so the shared footer cannot jump upward. */
export default function StorefrontPageLoading({ message = "Loading page…" }: Props) {
  return (
    <>
      <StorefrontLoadingOverlay message={message} />
      <div className="min-h-[70vh] bg-slate-50/70 px-4 py-10 sm:px-6" aria-hidden="true">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-4 w-36 rounded-full bg-slate-200" />
          <div className="mt-5 h-9 w-72 max-w-full rounded-xl bg-slate-200" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="aspect-[4/3] bg-slate-100" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-4/5 rounded-full bg-slate-200" />
                  <div className="h-4 w-2/5 rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
