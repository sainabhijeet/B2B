import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { ApiError, apiGet } from '@/lib/apiClient';
import type { FirebaseAdminMaskedResponse } from '@/lib/platformSettingsApi';
import {
  INITIAL_API_KEYS,
  INITIAL_EMAIL,
  INITIAL_PAYMENTS,
  INITIAL_PUSH,
  INITIAL_STORAGE,
  INITIAL_WEBHOOKS,
  type ApiKeyRow,
  type EmailProviderRow,
  type IntegrationStatus,
  type PaymentGatewayRow,
  PLATFORM_FCM_PUSH_ID,
  type PushProviderRow,
  type SmsProviderRow,
  type StorageProviderRow,
  type WebhookRow,
} from '@/lib/integrationsDemoData';
import type { SmsProvidersResponse } from '@/lib/platformSettingsApi';

type IntegrationsValue = {
  smsProviders: SmsProviderRow[];
  setSmsProviders: Dispatch<SetStateAction<SmsProviderRow[]>>;
  smsProvidersHydrated: boolean;
  smsProvidersError: string | null;
  reloadSmsProviders: () => Promise<void>;
  pushProvidersHydrated: boolean;
  pushProvidersError: string | null;
  reloadPushProviders: () => Promise<void>;
  emailProviders: EmailProviderRow[];
  setEmailProviders: Dispatch<SetStateAction<EmailProviderRow[]>>;
  pushProviders: PushProviderRow[];
  setPushProviders: Dispatch<SetStateAction<PushProviderRow[]>>;
  paymentGateways: PaymentGatewayRow[];
  setPaymentGateways: Dispatch<SetStateAction<PaymentGatewayRow[]>>;
  storageProviders: StorageProviderRow[];
  setStorageProviders: Dispatch<SetStateAction<StorageProviderRow[]>>;
  webhooks: WebhookRow[];
  setWebhooks: Dispatch<SetStateAction<WebhookRow[]>>;
  apiKeys: ApiKeyRow[];
  setApiKeys: Dispatch<SetStateAction<ApiKeyRow[]>>;
  dashboardStats: {
    activeCount: number;
    inactiveCount: number;
    errorCount: number;
    apiErrorsToday: number;
    lastSyncLabel: string;
  };
};

const IntegrationsContext = createContext<IntegrationsValue | null>(null);

function mapFirebaseAdminToPushRow(d: FirebaseAdminMaskedResponse): PushProviderRow {
  const st: IntegrationStatus = d.status === 'error' ? 'inactive' : d.status;
  return {
    id: PLATFORM_FCM_PUSH_ID,
    provider: 'Firebase Cloud Messaging',
    projectId: d.projectId?.trim() ?? '',
    clientEmail: d.clientEmail ?? '',
    serverKeyMasked: d.privateKeyMasked,
    appId: d.clientEmail || '—',
    status: st,
    firebaseFromApi: true,
  };
}

function countByStatus(rows: { status: IntegrationStatus }[]) {
  let active = 0;
  let inactive = 0;
  let error = 0;
  for (const r of rows) {
    if (r.status === 'active') active++;
    else if (r.status === 'error') error++;
    else inactive++;
  }
  return { active, inactive, error };
}

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const [smsProviders, setSmsProviders] = useState<SmsProviderRow[]>([]);
  const [smsProvidersHydrated, setSmsProvidersHydrated] = useState(false);
  const [smsProvidersError, setSmsProvidersError] = useState<string | null>(null);

  const reloadSmsProviders = useCallback(async () => {
    setSmsProvidersError(null);
    try {
      const d = await apiGet<SmsProvidersResponse>('/admin/platform-settings/sms-providers');
      const list = Array.isArray(d?.providers) ? d.providers : [];
      setSmsProviders(
        list.map((r) => ({
          id: r.id,
          provider: r.provider,
          apiKeyMasked: r.apiKeyMasked,
          senderId: r.senderId,
          route: r.route,
          status: r.status,
        })),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load SMS providers';
      setSmsProvidersError(msg);
      setSmsProviders([]);
    } finally {
      setSmsProvidersHydrated(true);
    }
  }, []);

  useEffect(() => {
    void reloadSmsProviders();
  }, [reloadSmsProviders]);

  const [pushProviders, setPushProviders] = useState<PushProviderRow[]>([]);
  const [pushProvidersHydrated, setPushProvidersHydrated] = useState(false);
  const [pushProvidersError, setPushProvidersError] = useState<string | null>(null);

  const reloadPushProviders = useCallback(async () => {
    setPushProvidersError(null);
    try {
      const d = await apiGet<FirebaseAdminMaskedResponse>('/admin/platform-settings/firebase-admin');
      const fcm = mapFirebaseAdminToPushRow(d);
      setPushProviders([fcm, ...INITIAL_PUSH.map((r) => ({ ...r }))]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load Firebase push settings';
      setPushProvidersError(msg);
      setPushProviders([
        mapFirebaseAdminToPushRow({
          projectId: '',
          clientEmail: '',
          privateKeyMasked: '—',
          status: 'inactive',
        }),
        ...INITIAL_PUSH.map((r) => ({ ...r })),
      ]);
    } finally {
      setPushProvidersHydrated(true);
    }
  }, []);

  useEffect(() => {
    void reloadPushProviders();
  }, [reloadPushProviders]);

  const [emailProviders, setEmailProviders] = useState<EmailProviderRow[]>(() =>
    INITIAL_EMAIL.map((r) => ({ ...r })),
  );
  const [paymentGateways, setPaymentGateways] = useState<PaymentGatewayRow[]>(() =>
    INITIAL_PAYMENTS.map((r) => ({ ...r })),
  );
  const [storageProviders, setStorageProviders] = useState<StorageProviderRow[]>(() =>
    INITIAL_STORAGE.map((r) => ({ ...r })),
  );
  const [webhooks, setWebhooks] = useState<WebhookRow[]>(() => INITIAL_WEBHOOKS.map((r) => ({ ...r })));
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>(() => INITIAL_API_KEYS.map((r) => ({ ...r })));

  const dashboardStats = useMemo(() => {
    const all = [
      ...smsProviders,
      ...emailProviders,
      ...pushProviders,
      ...paymentGateways,
      ...storageProviders,
      ...webhooks,
      ...apiKeys,
    ];
    const { active, inactive, error } = countByStatus(all);
    const parts: string[] = [];
    if (smsProvidersHydrated) parts.push('SMS');
    if (pushProvidersHydrated) parts.push('Push');
    const lastSyncLabel =
      parts.length === 0 ? 'Loading…' : `${parts.join(' & ')} from API`;
    return {
      activeCount: active,
      inactiveCount: inactive,
      errorCount: error,
      apiErrorsToday: 3,
      lastSyncLabel,
    };
  }, [
    smsProviders,
    emailProviders,
    pushProviders,
    paymentGateways,
    storageProviders,
    webhooks,
    apiKeys,
    smsProvidersHydrated,
    pushProvidersHydrated,
  ]);

  const value = useMemo(
    () => ({
      smsProviders,
      setSmsProviders,
      smsProvidersHydrated,
      smsProvidersError,
      reloadSmsProviders,
      pushProvidersHydrated,
      pushProvidersError,
      reloadPushProviders,
      emailProviders,
      setEmailProviders,
      pushProviders,
      setPushProviders,
      paymentGateways,
      setPaymentGateways,
      storageProviders,
      setStorageProviders,
      webhooks,
      setWebhooks,
      apiKeys,
      setApiKeys,
      dashboardStats,
    }),
    [
      smsProviders,
      smsProvidersHydrated,
      smsProvidersError,
      reloadSmsProviders,
      pushProvidersHydrated,
      pushProvidersError,
      reloadPushProviders,
      emailProviders,
      pushProviders,
      paymentGateways,
      storageProviders,
      webhooks,
      apiKeys,
      dashboardStats,
    ],
  );

  return <IntegrationsContext.Provider value={value}>{children}</IntegrationsContext.Provider>;
}

export function useIntegrations(): IntegrationsValue {
  const c = useContext(IntegrationsContext);
  if (!c) throw new Error('useIntegrations must be used inside IntegrationsProvider');
  return c;
}
