import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  TEMPLATE_VARIABLES,
  type NotificationLogRow,
  type NotificationTemplateRow,
} from '@/lib/notificationTemplateModels';
import { loadAdminModuleState, saveAdminModuleState } from '@/lib/adminModuleStateApi';
import { fetchAdminNotificationLogs } from '@/lib/adminNotificationsApi';

type NotificationTemplatesValue = {
  templates: NotificationTemplateRow[];
  setTemplates: Dispatch<SetStateAction<NotificationTemplateRow[]>>;
  logs: NotificationLogRow[];
  variableDefs: typeof TEMPLATE_VARIABLES;
};

const NotificationTemplatesContext = createContext<NotificationTemplatesValue | null>(null);

type NotificationBackendState = {
  templates: NotificationTemplateRow[];
};

const EMPTY_NOTIFICATION_STATE: NotificationBackendState = {
  templates: [],
};

export function NotificationTemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<NotificationTemplateRow[]>([]);
  const [logs, setLogs] = useState<NotificationLogRow[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadAdminModuleState<NotificationBackendState>('notification_templates', EMPTY_NOTIFICATION_STATE),
      fetchAdminNotificationLogs(),
    ])
      .then(([state, notificationLogs]) => {
        if (!alive) return;
        setTemplates(state.templates ?? []);
        setLogs(notificationLogs);
        loadedRef.current = true;
      })
      .catch(() => {
        if (alive) loadedRef.current = true;
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    void saveAdminModuleState<NotificationBackendState>('notification_templates', {
      templates,
    });
  }, [templates]);

  const value = useMemo(
    () => ({
      templates,
      setTemplates,
      logs,
      variableDefs: TEMPLATE_VARIABLES,
    }),
    [templates, logs],
  );

  return (
    <NotificationTemplatesContext.Provider value={value}>{children}</NotificationTemplatesContext.Provider>
  );
}

export function useNotificationTemplates(): NotificationTemplatesValue {
  const c = useContext(NotificationTemplatesContext);
  if (!c) throw new Error('useNotificationTemplates must be used inside NotificationTemplatesProvider');
  return c;
}
