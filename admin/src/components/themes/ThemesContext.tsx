import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ApiTheme } from '@/lib/themesApi';
import { fetchThemesCatalog, themesLoadErrorMessage } from '@/lib/themesApi';

type ThemesContextValue = {
  themes: ApiTheme[];
  themesLoading: boolean;
  themesError: string | null;
  reloadThemes: () => Promise<void>;
};

const ThemesContext = createContext<ThemesContextValue | null>(null);

export function ThemesProvider({ children }: { children: ReactNode }) {
  const [themes, setThemes] = useState<ApiTheme[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [themesError, setThemesError] = useState<string | null>(null);

  const reloadThemes = useCallback(async () => {
    setThemesLoading(true);
    setThemesError(null);
    try {
      const list = await fetchThemesCatalog();
      setThemes(Array.isArray(list) ? list : []);
    } catch (e) {
      setThemesError(themesLoadErrorMessage(e));
      setThemes([]);
    } finally {
      setThemesLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadThemes();
  }, [reloadThemes]);

  const value = useMemo(
    () => ({
      themes,
      themesLoading,
      themesError,
      reloadThemes,
    }),
    [themes, themesLoading, themesError, reloadThemes],
  );

  return <ThemesContext.Provider value={value}>{children}</ThemesContext.Provider>;
}

export function useThemes(): ThemesContextValue {
  const c = useContext(ThemesContext);
  if (!c) throw new Error('useThemes must be used inside ThemesProvider');
  return c;
}
