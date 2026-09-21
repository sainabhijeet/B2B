import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  FileText,
  Gift,
  ImageIcon,
  LayoutDashboard,
  Landmark,
  Package,
  Palette,
  Rocket,
  Settings,
  ShoppingCart,
  Tag,
  Tags,
  Ticket,
  LifeBuoy,
  Users,
  Warehouse,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };

function NavItems({ items }: { items: NavItem[] }) {
  return (
    <>
      {items.map(({ to, label, icon: Icon, end = false }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            [
              "flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-slate-100 text-slate-900"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")
          }
        >
          <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          {label}
        </NavLink>
      ))}
    </>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </div>
  );
}

function Sublink({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Package }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex items-center gap-2 rounded-sm py-1.5 pl-4 pr-2 text-xs font-medium transition-colors",
          isActive
            ? "bg-emerald-50 text-emerald-900"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        ].join(" ")
      }
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="flex w-[14.5rem] shrink-0 flex-col border-r border-slate-200 bg-white md:w-[15rem]">
      <div className="border-b border-slate-200 px-3 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tenant</div>
        <div className="text-xs font-semibold text-slate-800">Distributor panel</div>
      </div>
      <nav className="flex-1 space-y-px overflow-y-auto p-1.5">
        <NavItems items={[{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true }]} />

        <GroupLabel>Catalog</GroupLabel>
        <Sublink to="/catalog/products" label="Products" icon={Package} />
        <Sublink to="/catalog/categories" label="Categories" icon={Tags} />
        <Sublink to="/catalog/attributes" label="Attributes" icon={Tag} />
        <Sublink to="/catalog/brands" label="Brands" icon={Building2} />

        <GroupLabel>Commerce</GroupLabel>
        <NavItems
          items={[
            { to: "/customers", label: "Customers", icon: Users },
            { to: "/orders", label: "Orders", icon: ShoppingCart },
            { to: "/invoices", label: "Invoices", icon: FileText },
            { to: "/bank-details", label: "Bank Details", icon: Landmark },
            { to: "/support", label: "Support", icon: LifeBuoy },
          ]}
        />

        <GroupLabel>Inventory</GroupLabel>
        <Sublink to="/inventory/warehouses" label="Warehouses" icon={Warehouse} />
        <Sublink to="/inventory/stock" label="Stock" icon={Boxes} />

        <GroupLabel>Marketing</GroupLabel>
        <Sublink to="/marketing/coupons" label="Coupons" icon={Ticket} />
        <Sublink to="/content/banners" label="Banners" icon={ImageIcon} />

        <NavItems items={[{ to: "/analytics", label: "Analytics", icon: BarChart3 }]} />

        <GroupLabel>Release</GroupLabel>
        <Sublink to="/release-management/history" label="Release History" icon={Rocket} />
        <Sublink to="/release-management/settings" label="Release Settings" icon={Settings} />

        <NavItems items={[{ to: "/settings", label: "Settings", icon: Settings }]} />

        <GroupLabel>Store</GroupLabel>
        <NavItems
          items={[
            { to: "/billing", label: "Billing", icon: CreditCard },
            { to: "/referrals", label: "Referrals", icon: Gift },
            { to: "/website-builder", label: "Website Builder", icon: Palette },
          ]}
        />
      </nav>
      <div className="border-t border-slate-100 p-2 text-[10px] leading-snug text-slate-400">
        Optimized for desktop & tablet.{" "}
        {pathname.startsWith("/catalog") || pathname.startsWith("/orders") || pathname.startsWith("/customers")
          ? "Live APIs: catalog, orders, customers."
          : ""}
      </div>
    </aside>
  );
}
