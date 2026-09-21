import { NavLink, Outlet } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: "/billing/subscription", label: "Subscription", end: true },
  { to: "/billing/plans", label: "Plans", end: true },
];

export function BillingLayout() {
  return (
    <div>
      <PageHeader
        title="Billing"
        description="Tenant SaaS subscription (GET /billing/subscription, GET /billing/plans). Owner or manager required for plans list."
      />
      <div className="-mx-1 mb-4 overflow-x-auto border-b border-slate-200">
        <nav className="flex min-w-max gap-px px-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end ?? false}
              className={({ isActive }) =>
                [
                  "whitespace-nowrap border-b-2 px-2.5 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
                ].join(" ")
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
