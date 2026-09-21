import {
  createContext,
  useCallback,
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
  type FeatureLogRow,
  type FeatureRow,
  type FeatureStatus,
  type TenantFeatureOverride,
} from '@/lib/featureFlagModels';
import { loadAdminModuleState, saveAdminModuleState } from '@/lib/adminModuleStateApi';

type FeatureFlagsValue = {
  features: FeatureRow[];
  setFeatures: Dispatch<SetStateAction<FeatureRow[]>>;
  planMatrix: Record<string, Record<string, boolean>>;
  setPlanMatrix: Dispatch<SetStateAction<Record<string, Record<string, boolean>>>>;
  overrides: TenantFeatureOverride[];
  setOverrides: Dispatch<SetStateAction<TenantFeatureOverride[]>>;
  logs: FeatureLogRow[];
  setLogs: Dispatch<SetStateAction<FeatureLogRow[]>>;
  appendLog: (featureName: string, action: string, user?: string) => void;
  setFeatureStatus: (featureId: string, status: FeatureStatus) => void;
  togglePlanCell: (featureId: string, planId: string) => void;
  updateFeatureMeta: (featureId: string, patch: Partial<Pick<FeatureRow, 'featureName' | 'module' | 'type'>>) => void;
};

const FeatureFlagsContext = createContext<FeatureFlagsValue | null>(null);

type FeatureFlagsBackendState = {
  features: FeatureRow[];
  planMatrix: Record<string, Record<string, boolean>>;
  overrides: TenantFeatureOverride[];
  logs: FeatureLogRow[];
};

const EMPTY_FEATURE_FLAGS_STATE: FeatureFlagsBackendState = {
  features: [],
  planMatrix: {},
  overrides: [],
  logs: [],
};

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [planMatrix, setPlanMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [overrides, setOverrides] = useState<TenantFeatureOverride[]>([]);
  const [logs, setLogs] = useState<FeatureLogRow[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    loadAdminModuleState<FeatureFlagsBackendState>(
      'feature_flags',
      EMPTY_FEATURE_FLAGS_STATE,
    )
      .then((state) => {
        if (!alive) return;
        setFeatures(state.features ?? []);
        setPlanMatrix(state.planMatrix ?? {});
        setOverrides(state.overrides ?? []);
        setLogs(state.logs ?? []);
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
    void saveAdminModuleState<FeatureFlagsBackendState>('feature_flags', {
      features,
      planMatrix,
      overrides,
      logs,
    });
  }, [features, planMatrix, overrides, logs]);

  const appendLog = useCallback((featureName: string, action: string, user = 'Current admin') => {
    const row: FeatureLogRow = {
      id: `fl-${Date.now()}`,
      featureName,
      action,
      user,
      timestamp: new Date().toISOString(),
    };
    setLogs((list) => [row, ...list]);
  }, []);

  const setFeatureStatus = useCallback(
    (featureId: string, status: FeatureStatus) => {
      const f = features.find((x) => x.featureId === featureId);
      setFeatures((list) => list.map((x) => (x.featureId === featureId ? { ...x, status } : x)));
      if (f) appendLog(f.featureName, status === 'enabled' ? 'Feature enabled (master)' : 'Feature disabled (master)');
    },
    [features, appendLog],
  );

  const togglePlanCell = useCallback((featureId: string, planId: string) => {
    let enabled = false;
    setPlanMatrix((m) => {
      const prev = m[featureId]?.[planId] ?? false;
      enabled = !prev;
      return { ...m, [featureId]: { ...m[featureId], [planId]: enabled } };
    });
    const f = features.find((x) => x.featureId === featureId);
    if (f) appendLog(f.featureName, `Plan ${planId}: ${enabled ? 'enabled' : 'disabled'}`);
  }, [features, appendLog]);

  const updateFeatureMeta = useCallback(
    (featureId: string, patch: Partial<Pick<FeatureRow, 'featureName' | 'module' | 'type'>>) => {
      const f = features.find((x) => x.featureId === featureId);
      setFeatures((list) =>
        list.map((x) => (x.featureId === featureId ? { ...x, ...patch } : x)),
      );
      if (f) appendLog(f.featureName, 'Metadata updated');
    },
    [features, appendLog],
  );

  const value = useMemo(
    () => ({
      features,
      setFeatures,
      planMatrix,
      setPlanMatrix,
      overrides,
      setOverrides,
      logs,
      setLogs,
      appendLog,
      setFeatureStatus,
      togglePlanCell,
      updateFeatureMeta,
    }),
    [
      features,
      planMatrix,
      overrides,
      logs,
      appendLog,
      setFeatureStatus,
      togglePlanCell,
      updateFeatureMeta,
    ],
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlagsValue {
  const c = useContext(FeatureFlagsContext);
  if (!c) throw new Error('useFeatureFlags must be used inside FeatureFlagsProvider');
  return c;
}
