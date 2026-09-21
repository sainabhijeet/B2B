import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { createCustomer } from "@/api/customersApi";
import { ApiError } from "@/lib/apiClient";

export function CustomerCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      createCustomer({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        creditLimit: creditLimit.trim() || undefined,
      }),
    onSuccess: (res) => {
      const id = res.data?.id;
      if (id) void navigate(`/customers/${id}`);
      else void navigate("/customers");
    },
    onError: (e: unknown) => {
      setError(e instanceof ApiError ? e.message : "Could not create customer.");
    },
  });

  return (
    <div>
      <div className="mb-4">
        <Link to="/customers" className="text-sm font-medium text-emerald-700 hover:underline">
          ← Customers
        </Link>
      </div>
      <PageHeader title="Add retailer" description="Creates a `customers` row with optional opening credit limit." />
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <form
        className="max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mut.mutate();
        }}
      >
        <div>
          <label className="text-xs font-medium text-slate-600">Name</label>
          <input
            required
            className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Mobile (8–20 chars)</label>
          <input
            required
            className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Email (optional)</label>
          <input
            type="email"
            className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Credit limit (optional, ₹)</label>
          <input
            className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            placeholder="e.g. 50000"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending ? "Saving…" : "Create"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void navigate("/customers")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
