import { useEffect, useState } from "react";
import { apiGet } from "@/lib/apiClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";

type Ticket = {
  id: string;
  contactName?: string | null;
  contactEmail?: string | null;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
};

export function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ data: Ticket[] }>("/support/tickets")
      .then((response) => setTickets(response.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load support requests."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Support requests" description="Questions and issues submitted by your retailers." />
      {loading ? <p className="text-sm text-slate-600">Loading requests…</p> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {!loading && !error && !tickets.length ? <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No support requests yet.</div> : null}
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <article key={ticket.id} id={ticket.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-sm font-semibold text-slate-900">{ticket.subject}</h2><p className="mt-1 text-xs text-slate-500">{ticket.contactName || "Signed-in retailer"}{ticket.contactEmail ? ` · ${ticket.contactEmail}` : ""}</p></div>
              <div className="flex gap-2"><Badge variant={ticket.priority === "HIGH" ? "danger" : ticket.priority === "MEDIUM" ? "warning" : "neutral"}>{ticket.priority}</Badge><Badge variant={ticket.status === "OPEN" ? "warning" : "neutral"}>{ticket.status}</Badge></div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.description}</p>
            <p className="mt-3 text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
