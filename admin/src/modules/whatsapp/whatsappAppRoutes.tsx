import { Outlet, Route } from 'react-router-dom';
import { WhatsAppConfigPage } from './pages/WhatsAppConfigPage';
import { WhatsAppHealthPage } from './pages/WhatsAppHealthPage';
import { WhatsAppOverviewPage } from './pages/WhatsAppOverviewPage';
import { WhatsAppPlatformLibraryPage } from './pages/WhatsAppPlatformLibraryPage';
import { WhatsAppTemplatesPage } from './pages/WhatsAppTemplatesPage';

/**
 * JSX tree of `/whatsapp/*` routes. Must be a `<Route>` (or Fragment of routes) — not a
 * wrapper component — because `<Routes>` only accepts `<Route>` / `<Fragment>` children.
 */
export const whatsappAppRoutes = (
  <Route path="/whatsapp" element={<Outlet />}>
    <Route path="health" element={<WhatsAppHealthPage />} />
    <Route path="platform-templates" element={<WhatsAppPlatformLibraryPage />} />
    <Route path=":tenantId/templates" element={<WhatsAppTemplatesPage />} />
    <Route path=":tenantId" element={<WhatsAppConfigPage />} />
    <Route index element={<WhatsAppOverviewPage />} />
  </Route>
);
