import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RefreshCw, Smartphone, Tablet, Monitor, ZoomIn, ZoomOut, ExternalLink, RotateCcw } from 'lucide-react';
import { useThemes } from '@/components/themes/ThemesContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { demoHostToUrl, readDemoHost, readThemeDescription, type ApiTheme } from '@/lib/themesApi';
import { storageUrl } from '@/lib/apiBase';

type Viewport = 'mobile' | 'tablet' | 'desktop';
type Surface = 'website' | 'app';
type AppScreen = 'home' | 'category' | 'product' | 'cart' | 'checkout' | 'account';

const LANGUAGES = [
  ['en', 'English'],
  ['hi', 'Hindi'],
  ['zh', 'Chinese'],
  ['ar', 'Arabic'],
  ['fr', 'French'],
  ['de', 'German'],
  ['es', 'Spanish'],
  ['gu', 'Gujarati'],
  ['ur', 'Urdu'],
  ['ru', 'Russian'],
  ['ja', 'Japanese'],
] as const;

const APP_SCREENS: Array<{ id: AppScreen; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'category', label: 'Category' },
  { id: 'product', label: 'Product' },
  { id: 'cart', label: 'Cart' },
  { id: 'checkout', label: 'Checkout' },
  { id: 'account', label: 'Account' },
];

const frameClass: Record<Viewport, string> = {
  desktop: 'h-[min(72vh,760px)] w-full',
  tablet: 'h-[min(72vh,760px)] w-[min(768px,100%)]',
  mobile: 'h-[min(72vh,844px)] w-[390px]',
};

function enabled(raw: string | undefined): boolean {
  return raw === '1' || raw === 'true';
}

function readConfigString(theme: ApiTheme, key: string): string | null {
  const value = theme.themeConfigJson?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readConfigBoolean(theme: ApiTheme, key: string): boolean {
  return theme.themeConfigJson?.[key] === true;
}

function previewOrigin(theme: ApiTheme, surface: Surface): string | null {
  const configured = surface === 'website'
    ? readConfigString(theme, 'previewUrl') ?? readDemoHost(theme.themeConfigJson) ?? import.meta.env.VITE_STOREFRONT_PREVIEW_URL
    : readConfigString(theme, 'mobilePreviewUrl') ?? import.meta.env.VITE_MOBILE_PREVIEW_URL;
  return configured ? demoHostToUrl(configured) : null;
}

function makePreviewUrl(
  origin: string,
  theme: ApiTheme,
  surface: Surface,
  language: string,
  customization: Record<string, string>,
  screen: AppScreen,
  nonce: number,
): string {
  const url = new URL(origin);
  url.searchParams.set('previewMode', '1');
  url.searchParams.set('previewSurface', surface);
  url.searchParams.set('previewLanguage', language);
  if (theme.slug) url.searchParams.set('theme', theme.slug);
  if (surface === 'app') url.searchParams.set('screen', screen);
  Object.entries(customization).forEach(([key, value]) => {
    if (value) url.searchParams.set(`preview${key[0].toUpperCase()}${key.slice(1)}`, value);
  });
  url.searchParams.set('_preview', String(nonce));
  return url.toString();
}

function languageName(code: string): string {
  return LANGUAGES.find(([id]) => id === code)?.[1] ?? code;
}

const THEME_PREVIEW_MESSAGE = 'theme-editor-state';
const RTL_LANGUAGES = new Set(['ar', 'ur']);

function previewLanguageContract(languageCode: string, revision = 0) {
  const normalized = languageCode.trim().toLowerCase().replace('_', '-').split('-')[0] || 'en';
  return {
    languageCode: normalized,
    locale: normalized === 'en' ? 'en-IN' : normalized,
    direction: RTL_LANGUAGES.has(normalized) ? 'rtl' : 'ltr',
    revision,
    source: 'tenant_app_settings.selected_language_code',
  };
}

export function ThemePreviewPage() {
  const { id } = useParams();
  const { themes, themesLoading, themesError, reloadThemes } = useThemes();
  const theme = useMemo(() => themes.find((item) => item.id === id), [themes, id]);
  const previewEnabled = enabled(import.meta.env.VITE_THEME_PREVIEW_ENABLED);
  const [surface, setSurface] = useState<Surface>('website');
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [language, setLanguage] = useState('en');
  const [screen, setScreen] = useState<AppScreen>('home');
  const [zoom, setZoom] = useState(100);
  const [nonce, setNonce] = useState(Date.now());
  const [loaded, setLoaded] = useState(false);
  const [customization, setCustomization] = useState({ primaryColor: '', secondaryColor: '', fontFamily: '', borderRadius: '' });
  const [diagnostics, setDiagnostics] = useState<{ language: string; direction: string; missingTranslations: string[]; translationComplete: boolean } | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!id) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`theme-preview:${id}`) ?? '{}') as { language?: string; customization?: typeof customization };
      if (saved.language) setLanguage(saved.language);
      if (saved.customization) setCustomization((current) => ({ ...current, ...saved.customization }));
    } catch {
      // A corrupt preview preference must not prevent the preview from opening.
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`theme-preview:${id}`, JSON.stringify({ language, customization }));
  }, [id, language, customization]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || event.data?.type !== 'theme-preview-diagnostics') return;
      setDiagnostics(event.data);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const websiteUrl = theme ? previewOrigin(theme, 'website') : null;
  const appUrl = theme ? previewOrigin(theme, 'app') : null;
  const origin = surface === 'website' ? websiteUrl : appUrl;
  const previewUrl = theme && origin
    ? makePreviewUrl(origin, theme, surface, language, customization, screen, nonce)
    : null;
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const iframeResetKey = `${theme?.id ?? ''}:${origin ?? ''}:${surface}:${screen}:${nonce}`;
  useEffect(() => {
    setIframeUrl(previewUrl);
    setLoaded(false);
    // Keep language/customization changes postMessage-driven so the renderer does not remount for live edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeResetKey]);
  const compatibility = readConfigString(theme ?? ({} as ApiTheme), 'compatibility') ?? (theme?.themeChannel === 'MOBILE' ? 'Mobile app' : 'Website');
  const author = theme ? readConfigString(theme, 'author') ?? 'Platform theme team' : '';
  const darkMode = theme ? readConfigBoolean(theme, 'darkMode') : false;

  useEffect(() => {
    if (!frameRef.current?.contentWindow) return;
    const languageContract = previewLanguageContract(language, nonce);
    frameRef.current.contentWindow.postMessage({
      type: THEME_PREVIEW_MESSAGE,
      state: {
        languageCode: languageContract.languageCode,
        languageContract,
        page: screen === 'category' || screen === 'product' ? screen : 'home',
        tokenOverrides: customization,
      },
    }, '*');
  }, [customization, language, nonce, screen]);

  if (!previewEnabled) {
    return <FeatureDisabled />;
  }
  if (themesError) {
    return <div className="p-4 text-xs text-amber-900">{themesError} <button type="button" className="underline" onClick={() => void reloadThemes()}>Retry</button></div>;
  }
  if (themesLoading && !theme) return <div className="p-4 text-xs text-slate-600">Loading theme…</div>;
  if (!theme) return <div className="p-4 text-xs text-slate-700">Theme not found. <Link to="/themes/list" className="text-indigo-600 underline">Back to catalog</Link></div>;

  const updateCustomization = (key: keyof typeof customization, value: string) => setCustomization((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Preview · ${theme.themeName}`}
        description="Preview mode uses the configured production renderer in an isolated frame. Nothing here changes the live storefront."
        actions={<div className="flex flex-wrap gap-1.5"><Link to={`/themes/${theme.id}/edit`} className={adminBtnSecondary}>Customize</Link>{origin ? <a href={previewUrl ?? origin} target="_blank" rel="noreferrer" className={adminBtnSecondary}>Open preview <ExternalLink size={12} className="ml-1 inline" /></a> : null}</div>}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-950">
        <span><strong>Preview Mode</strong> · isolated from live traffic · language: {languageName(language)}</span>
        <span className="font-mono text-[10px]">v{theme.themeVersion ?? 'unversioned'}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ResourcePanel title={surface === 'website' ? 'Website preview' : 'Mobile app preview'}>
          <PreviewToolbar surface={surface} setSurface={setSurface} viewport={viewport} setViewport={setViewport} zoom={zoom} setZoom={setZoom} refresh={() => { setLoaded(false); setNonce(Date.now()); }} />
          {surface === 'app' ? <AppToolbar screen={screen} setScreen={setScreen} darkMode={darkMode} /> : null}
          <div className="relative flex min-h-[520px] justify-center overflow-auto bg-slate-100 p-4">
            {!iframeUrl ? <Unavailable surface={surface} /> : <div className={`relative overflow-hidden border border-slate-300 bg-white shadow-xl transition-all ${surface === 'app' ? 'rounded-[2.25rem] p-2' : 'rounded-lg'} ${frameClass[viewport]}`} style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', marginBottom: `${(zoom - 100) * 3}px` }}>
              {!loaded ? <div className="absolute inset-0 z-10 animate-pulse bg-slate-100"><div className="m-6 h-8 rounded bg-slate-200" /><div className="m-6 h-64 rounded bg-slate-200" /><div className="m-6 h-20 rounded bg-slate-200" /></div> : null}
              <iframe ref={frameRef} key={`${theme.id}:${surface}`} title={`${theme.themeName} ${surface} preview`} src={iframeUrl} className="h-full w-full border-0" onLoad={() => setLoaded(true)} />
              <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-slate-950/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-white">Preview Mode</div>
            </div>}
          </div>
        </ResourcePanel>

        <aside className="space-y-4">
          <ResourcePanel title="Theme information"><ThemeInfo theme={theme} author={author} compatibility={compatibility} /></ResourcePanel>
          <ResourcePanel title="Language experience"><LanguageControls language={language} setLanguage={setLanguage} /></ResourcePanel>
          <ResourcePanel title="Preview validation"><ValidationPanel diagnostics={diagnostics} language={language} /></ResourcePanel>
          <ResourcePanel title="Live customization"><CustomizationControls values={customization} update={updateCustomization} reset={() => setCustomization({ primaryColor: '', secondaryColor: '', fontFamily: '', borderRadius: '' })} /></ResourcePanel>
        </aside>
      </div>
    </div>
  );
}

function FeatureDisabled() { return <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950"><h2 className="font-semibold">Theme Preview is disabled</h2><p className="mt-1 text-xs">Enable <code>VITE_THEME_PREVIEW_ENABLED=true</code> in the distributor panel build to use isolated previews.</p></div>; }

function Unavailable({ surface }: { surface: Surface }) { return <div className="m-auto max-w-sm rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center"><h3 className="font-semibold text-slate-900">{surface === 'website' ? 'Website renderer not configured' : 'App renderer not configured'}</h3><p className="mt-2 text-xs leading-relaxed text-slate-500">Configure the real {surface} preview URL for this theme or the platform environment. Static screenshots are intentionally not used as a substitute.</p></div>; }

function PreviewToolbar({ surface, setSurface, viewport, setViewport, zoom, setZoom, refresh }: { surface: Surface; setSurface: (value: Surface) => void; viewport: Viewport; setViewport: (value: Viewport) => void; zoom: number; setZoom: (value: number) => void; refresh: () => void }) {
  return <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 p-2"><button type="button" className={surface === 'website' ? 'rounded bg-slate-900 px-2 py-1 text-[10px] text-white' : 'rounded bg-slate-100 px-2 py-1 text-[10px]'} onClick={() => setSurface('website')}>Website</button><button type="button" className={surface === 'app' ? 'rounded bg-slate-900 px-2 py-1 text-[10px] text-white' : 'rounded bg-slate-100 px-2 py-1 text-[10px]'} onClick={() => setSurface('app')}>Mobile App</button><span className="mx-1 h-4 w-px bg-slate-200" />{(['desktop', 'tablet', 'mobile'] as Viewport[]).map((item) => <button key={item} type="button" title={item} className={viewport === item ? 'rounded bg-indigo-100 px-2 py-1 text-[10px] text-indigo-800' : 'rounded bg-slate-100 px-2 py-1 text-[10px]'} onClick={() => setViewport(item)}>{item === 'desktop' ? <Monitor size={12} /> : item === 'tablet' ? <Tablet size={12} /> : <Smartphone size={12} />}</button>)}<span className="mx-1 h-4 w-px bg-slate-200" /><button type="button" className="rounded bg-slate-100 p-1" onClick={() => setZoom(Math.max(50, zoom - 10))}><ZoomOut size={13} /></button><span className="w-8 text-center text-[10px]">{zoom}%</span><button type="button" className="rounded bg-slate-100 p-1" onClick={() => setZoom(Math.min(120, zoom + 10))}><ZoomIn size={13} /></button><button type="button" className="ml-auto rounded bg-slate-100 p-1" title="Refresh preview" onClick={refresh}><RefreshCw size={13} /></button></div>;
}

function AppToolbar({ screen, setScreen, darkMode }: { screen: AppScreen; setScreen: (value: AppScreen) => void; darkMode: boolean }) { return <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2">{APP_SCREENS.map((item) => <button key={item.id} type="button" className={screen === item.id ? 'whitespace-nowrap rounded bg-indigo-100 px-2 py-1 text-[10px] text-indigo-800' : 'whitespace-nowrap rounded bg-slate-100 px-2 py-1 text-[10px]'} onClick={() => setScreen(item.id)}>{item.label}</button>)}{darkMode ? <span className="ml-auto whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white">Dark mode supported</span> : null}</div>; }

function ThemeInfo({ theme, author, compatibility }: { theme: ApiTheme; author: string; compatibility: string }) { return <div className="space-y-3 p-3 text-xs"><div className="flex gap-3">{theme.previewImage ? <img src={storageUrl(theme.previewImage)} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <div className="h-16 w-16 rounded-lg bg-slate-100" />}<div><div className="font-semibold text-slate-900">{theme.themeName}</div><div className="text-slate-500">by {author}</div><div className="mt-1 text-[10px] text-slate-500">Version {theme.themeVersion ?? 'Unversioned'}</div></div></div><div className="grid grid-cols-2 gap-2"><Metric label="Compatibility" value={compatibility} /><Metric label="Channel" value={theme.themeChannel ?? 'WEB'} /></div>{readThemeDescription(theme.themeConfigJson) ? <p className="leading-relaxed text-slate-600">{readThemeDescription(theme.themeConfigJson)}</p> : null}</div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded border border-slate-100 p-2"><div className="text-[9px] uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 font-medium text-slate-800">{value}</div></div>; }
function LanguageControls({ language, setLanguage }: { language: string; setLanguage: (value: string) => void }) { return <div className="space-y-2 p-3"><label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Single active language</label><select value={language} onChange={(event) => setLanguage(event.target.value)} className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs">{LANGUAGES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><p className="text-[10px] leading-relaxed text-slate-500">Website and mobile preview receive the same language. RTL direction and locale formatting are handled by the renderer.</p><div className="rounded bg-emerald-50 p-2 text-[10px] text-emerald-800">No mixed-language fallback is requested by the preview shell.</div></div>; }
function ValidationPanel({ diagnostics, language }: { diagnostics: { direction: string; missingTranslations: string[]; translationComplete: boolean } | null; language: string }) { if (!diagnostics) return <div className="p-3 text-[10px] text-slate-500">Waiting for the real renderer diagnostics…</div>; return <div className="space-y-2 p-3 text-[10px]"><div className={diagnostics.translationComplete ? 'rounded bg-emerald-50 p-2 text-emerald-800' : 'rounded bg-amber-50 p-2 text-amber-800'}>{diagnostics.translationComplete ? `${languageName(language)} translation complete` : `${diagnostics.missingTranslations.length} untranslated strings detected`}</div><div className="text-slate-500">Direction: <strong>{diagnostics.direction.toUpperCase()}</strong> · fallback report is internal only.</div>{diagnostics.missingTranslations.length ? <details><summary className="cursor-pointer text-indigo-700">View missing strings</summary><ul className="mt-1 max-h-28 list-disc overflow-auto pl-4 text-slate-600">{diagnostics.missingTranslations.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}</div>; }
function CustomizationControls({ values, update, reset }: { values: Record<string, string>; update: (key: 'primaryColor' | 'secondaryColor' | 'fontFamily' | 'borderRadius', value: string) => void; reset: () => void }) { return <div className="space-y-2 p-3">{(['primaryColor', 'secondaryColor'] as const).map((key) => <label key={key} className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{key === 'primaryColor' ? 'Primary color' : 'Secondary color'}<input type="color" value={values[key] || '#334155'} onChange={(event) => update(key, event.target.value)} className="mt-1 h-8 w-full cursor-pointer rounded border border-slate-200" /></label>)}<label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Typography<input value={values.fontFamily} onChange={(event) => update('fontFamily', event.target.value)} placeholder="Theme default" className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs" /></label><label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Border radius<input value={values.borderRadius} onChange={(event) => update('borderRadius', event.target.value)} placeholder="Theme default" className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs" /></label><button type="button" className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-900" onClick={reset}><RotateCcw size={11} /> Reset changes</button></div>; }
