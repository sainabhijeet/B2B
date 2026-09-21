import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from '@/lib/apiClient';
import type { IndustryMappingRow, IndustryRow, IndustryStatus } from '@/lib/industriesDemoData';

type IndustriesContextValue = {
  industries: IndustryRow[];
  industriesLoading: boolean;
  industriesError: string | null;
  reloadIndustries: () => Promise<void>;
  mappings: IndustryMappingRow[];
  addIndustry: (input: Omit<IndustryRow, 'industryId' | 'displayOrder' | 'createdAt'>) => Promise<string>;
  updateIndustry: (industryId: string, patch: Partial<IndustryRow>) => Promise<void>;
  deleteIndustry: (industryId: string) => Promise<void>;
  toggleIndustryStatus: (industryId: string) => Promise<void>;
};

const IndustriesContext = createContext<IndustriesContextValue | null>(null);

function mapMappings(rows: IndustryRow[]): IndustryMappingRow[] {
  return rows.map((r) => ({
    industryId: r.industryId,
    industryName: r.name,
    categoryNames: [],
    attributeNames: [],
    themeNames: [],
  }));
}

export function IndustriesProvider({ children }: { children: ReactNode }) {
  const [industries, setIndustries] = useState<IndustryRow[]>([]);
  const [industriesLoading, setIndustriesLoading] = useState(true);
  const [industriesError, setIndustriesError] = useState<string | null>(null);

  const reloadIndustries = useCallback(async () => {
    setIndustriesLoading(true);
    setIndustriesError(null);
    try {
      const list = await apiGet<IndustryRow[]>('/admin/industries');
      setIndustries(Array.isArray(list) ? list : []);
    } catch (e) {
      setIndustriesError(e instanceof ApiError ? e.message : 'Failed to load industries');
      setIndustries([]);
    } finally {
      setIndustriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadIndustries();
  }, [reloadIndustries]);

  const mappings = useMemo(() => mapMappings(industries), [industries]);

  const addIndustry = useCallback(
    async (input: Omit<IndustryRow, 'industryId' | 'displayOrder' | 'createdAt'>): Promise<string> => {
      const created = await apiPost<IndustryRow>('/admin/industries', {
        name: input.name,
        description: input.description,
        icon: input.icon,
        status: input.status,
      });
      await reloadIndustries();
      return created.industryId;
    },
    [reloadIndustries],
  );

  const updateIndustry = useCallback(
    async (industryId: string, patch: Partial<IndustryRow>): Promise<void> => {
      await apiPatch(`/admin/industries/${industryId}`, {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.displayOrder !== undefined ? { displayOrder: patch.displayOrder } : {}),
      });
      await reloadIndustries();
    },
    [reloadIndustries],
  );

  const deleteIndustry = useCallback(
    async (industryId: string): Promise<void> => {
      await apiDelete(`/admin/industries/${industryId}`);
      await reloadIndustries();
    },
    [reloadIndustries],
  );

  const toggleIndustryStatus = useCallback(
    async (industryId: string): Promise<void> => {
      const row = industries.find((r) => r.industryId === industryId);
      if (!row) return;
      const next: IndustryStatus = row.status === 'active' ? 'inactive' : 'active';
      await updateIndustry(industryId, { status: next });
    },
    [industries, updateIndustry],
  );

  const value = useMemo(
    () => ({
      industries,
      industriesLoading,
      industriesError,
      reloadIndustries,
      mappings,
      addIndustry,
      updateIndustry,
      deleteIndustry,
      toggleIndustryStatus,
    }),
    [
      industries,
      industriesLoading,
      industriesError,
      reloadIndustries,
      mappings,
      addIndustry,
      updateIndustry,
      deleteIndustry,
      toggleIndustryStatus,
    ],
  );

  return <IndustriesContext.Provider value={value}>{children}</IndustriesContext.Provider>;
}

export function useIndustries(): IndustriesContextValue {
  const c = useContext(IndustriesContext);
  if (!c) throw new Error('useIndustries must be used inside IndustriesProvider');
  return c;
}

export type { IndustryStatus };
