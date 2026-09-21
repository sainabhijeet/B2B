import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  DEFAULT_ANNOUNCEMENT_SETTINGS,
  INITIAL_ANNOUNCEMENT_HISTORY,
  INITIAL_ANNOUNCEMENTS,
  AUDIENCE_LABELS,
  type AnnouncementHistoryRow,
  type AnnouncementRow,
  type AnnouncementSettings,
} from '@/lib/announcementsDemoData';

type AnnouncementsValue = {
  announcements: AnnouncementRow[];
  setAnnouncements: Dispatch<SetStateAction<AnnouncementRow[]>>;
  history: AnnouncementHistoryRow[];
  setHistory: Dispatch<SetStateAction<AnnouncementHistoryRow[]>>;
  settings: AnnouncementSettings;
  setSettings: Dispatch<SetStateAction<AnnouncementSettings>>;
  addAnnouncement: (row: Omit<AnnouncementRow, 'announcementId' | 'createdAt'>) => void;
  updateAnnouncement: (id: string, patch: Partial<AnnouncementRow>) => void;
  deleteAnnouncement: (row: AnnouncementRow) => void;
  archiveToHistory: (row: AnnouncementRow) => void;
};

const AnnouncementsContext = createContext<AnnouncementsValue | null>(null);

export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>(() =>
    INITIAL_ANNOUNCEMENTS.map((a) => ({ ...a })),
  );
  const [history, setHistory] = useState<AnnouncementHistoryRow[]>(() =>
    INITIAL_ANNOUNCEMENT_HISTORY.map((h) => ({ ...h })),
  );
  const [settings, setSettings] = useState<AnnouncementSettings>(() => ({
    ...DEFAULT_ANNOUNCEMENT_SETTINGS,
  }));

  const addAnnouncement = useCallback(
    (row: Omit<AnnouncementRow, 'announcementId' | 'createdAt'>) => {
      const id = `an-${Date.now()}`;
      const full: AnnouncementRow = {
        ...row,
        announcementId: id,
        createdAt: new Date().toISOString(),
      };
      setAnnouncements((list) => [full, ...list]);
    },
    [],
  );

  const updateAnnouncement = useCallback((id: string, patch: Partial<AnnouncementRow>) => {
    setAnnouncements((list) => list.map((a) => (a.announcementId === id ? { ...a, ...patch } : a)));
  }, []);

  const archiveToHistory = useCallback((row: AnnouncementRow) => {
    setHistory((h) => [
      {
        id: `ah-${Date.now()}`,
        title: row.title,
        audienceLabel: AUDIENCE_LABELS[row.audience] + (row.audienceNote ? ` — ${row.audienceNote}` : ''),
        createdAt: row.createdAt.slice(0, 10),
        status: 'Archived',
      },
      ...h,
    ]);
  }, []);

  const deleteAnnouncement = useCallback(
    (row: AnnouncementRow) => {
      archiveToHistory(row);
      setAnnouncements((list) => list.filter((a) => a.announcementId !== row.announcementId));
    },
    [archiveToHistory],
  );

  const value = useMemo(
    () => ({
      announcements,
      setAnnouncements,
      history,
      setHistory,
      settings,
      setSettings,
      addAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      archiveToHistory,
    }),
    [announcements, history, settings, addAnnouncement, updateAnnouncement, deleteAnnouncement, archiveToHistory],
  );

  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
}

export function useAnnouncements(): AnnouncementsValue {
  const c = useContext(AnnouncementsContext);
  if (!c) throw new Error('useAnnouncements must be used inside AnnouncementsProvider');
  return c;
}
