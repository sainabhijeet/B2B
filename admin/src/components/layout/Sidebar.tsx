import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  FolderTree,
  ListChecks,
  Hammer,
  Palette,
  Megaphone,
  BarChart3,
  Headphones,
  Settings,
  ScrollText,
  Activity,
  UsersRound,
  Languages,
  Bell,
  Plug,
  Images,
  Flag as LucideFlag,
  CalendarClock,
  Newspaper,
  DatabaseBackup,
  Ticket,
  Receipt,
  Factory,
  MapPin,
  Tag,
  MessageCircle,
  Package,
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/activity', label: 'System activity', icon: Activity, end: false },
  { to: '/tenants', label: 'Tenants', icon: Building2 },
  { to: '/subscriptions/plans', label: 'Subscriptions', icon: CreditCard },
  { to: '/subscriptions/coupons', label: 'Subscription coupons', icon: Ticket, end: false },
  { to: '/billing', label: 'Billing', icon: Receipt, end: false },
  { to: '/industries', label: 'Industries', icon: Factory, end: false },
  { to: '/locations', label: 'Locations', icon: MapPin, end: false },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/attributes', label: 'Attributes', icon: ListChecks },
  { to: '/master-brands', label: 'Master brands', icon: Tag },
  { to: '/build', label: 'Build Manager', icon: Hammer, end: false },
  { to: '/themes', label: 'Themes', icon: Palette, end: false },
  { to: '/ads', label: 'Ads Manager', icon: Megaphone, end: false },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, end: false },
  { to: '/support', label: 'Support', icon: Headphones },
  { to: '/languages', label: 'Languages', icon: Languages, end: false },
  { to: '/notifications', label: 'Notifications', icon: Bell, end: false },
  { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle, end: false },
  { to: '/integrations', label: 'Integrations', icon: Plug, end: false },
  { to: '/media', label: 'Media', icon: Images, end: false },
  { to: '/feature-flags', label: 'Feature flags', icon: LucideFlag, end: false },
  { to: '/scheduler', label: 'Scheduler', icon: CalendarClock, end: false },
  { to: '/announcements', label: 'Announcements', icon: Newspaper, end: false },
  { to: '/admin-team', label: 'Admin team', icon: UsersRound, end: false },
  { to: '/settings', label: 'System Settings', icon: Settings, end: false },
  { to: '/backup', label: 'Backup & restore', icon: DatabaseBackup, end: false },
  { to: '/logs', label: 'Logs', icon: ScrollText, end: false },
];

export function Sidebar() {
  return (
    <aside className="flex w-[13.5rem] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Resources
        </div>
        <div className="text-xs font-semibold text-slate-800">Super Admin</div>
      </div>
      <nav className="flex-1 space-y-px overflow-y-auto p-1.5">
        {nav.map(({ to, label, icon: Icon, end = false }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              ].join(' ')
            }
          >
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
