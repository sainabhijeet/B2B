import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { MediaManagerProvider } from '@/components/media/MediaManagerContext';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/media/library', label: 'Media library', end: true },
  { to: '/media/upload', label: 'Upload files', end: true },
  { to: '/media/folders', label: 'Folders', end: true },
  { to: '/media/storage', label: 'Storage usage', end: true },
];

export function MediaManagerLayout() {
  return (
    <MediaManagerProvider>
      <div>
        <PageHeader
          title="Media & file manager"
          description="Central library for tenant logos, catalog images, ads, themes, and documents. Served via CDN; access can be public, private, or signed URLs."
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
                    'whitespace-nowrap border-b-2 px-2.5 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
                  ].join(' ')
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <Outlet />
      </div>
    </MediaManagerProvider>
  );
}
