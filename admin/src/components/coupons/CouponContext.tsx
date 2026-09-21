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
  type AdminCouponRow,
  type AdminCouponUsageRow,
  type CouponCampaignRow,
  type CouponGlobalSettings,
  type DistributorCouponSummary,
  type DistributorCouponUsageRow,
} from '@/lib/couponModels';
import { loadAdminModuleState, saveAdminModuleState } from '@/lib/adminModuleStateApi';

type CouponContextValue = {
  coupons: AdminCouponRow[];
  setCoupons: Dispatch<SetStateAction<AdminCouponRow[]>>;
  campaigns: CouponCampaignRow[];
  setCampaigns: Dispatch<SetStateAction<CouponCampaignRow[]>>;
  usage: AdminCouponUsageRow[];
  setUsage: Dispatch<SetStateAction<AdminCouponUsageRow[]>>;
  settings: CouponGlobalSettings;
  setSettings: Dispatch<SetStateAction<CouponGlobalSettings>>;
  distributorSummaries: DistributorCouponSummary[];
  distributorUsage: DistributorCouponUsageRow[];
  addCoupon: (row: Omit<AdminCouponRow, 'couponId' | 'createdAt' | 'usedCount' | 'revenueAttributed'>) => string;
  updateCoupon: (couponId: string, patch: Partial<AdminCouponRow>) => void;
  deleteCoupon: (couponId: string) => void;
  toggleCouponDisabled: (couponId: string) => void;
  usageForCoupon: (couponId: string) => AdminCouponUsageRow[];
  analytics: {
    totalRedemptions: number;
    totalDiscountGiven: number;
    topCoupons: { code: string; usage: number; revenue: number }[];
  };
};

const CouponContext = createContext<CouponContextValue | null>(null);

type CouponBackendState = {
  coupons: AdminCouponRow[];
  campaigns: CouponCampaignRow[];
  usage: AdminCouponUsageRow[];
  settings: CouponGlobalSettings;
  distributorSummaries: DistributorCouponSummary[];
  distributorUsage: DistributorCouponUsageRow[];
};

const EMPTY_COUPON_STATE: CouponBackendState = {
  coupons: [],
  campaigns: [],
  usage: [],
  settings: {
    enabled: false,
    allowStacking: false,
    maxDiscountPercent: 0,
    defaultExpiryDays: 0,
  },
  distributorSummaries: [],
  distributorUsage: [],
};

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function CouponProvider({ children }: { children: ReactNode }) {
  const [coupons, setCoupons] = useState<AdminCouponRow[]>([]);
  const [campaigns, setCampaigns] = useState<CouponCampaignRow[]>([]);
  const [usage, setUsage] = useState<AdminCouponUsageRow[]>([]);
  const [settings, setSettings] = useState<CouponGlobalSettings>(EMPTY_COUPON_STATE.settings);
  const [distributorSummaries, setDistributorSummaries] = useState<DistributorCouponSummary[]>([]);
  const [distributorUsage, setDistributorUsage] = useState<DistributorCouponUsageRow[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    loadAdminModuleState<CouponBackendState>('coupons', EMPTY_COUPON_STATE)
      .then((state) => {
        if (!alive) return;
        setCoupons(state.coupons ?? []);
        setCampaigns(state.campaigns ?? []);
        setUsage(state.usage ?? []);
        setSettings(state.settings ?? EMPTY_COUPON_STATE.settings);
        setDistributorSummaries(state.distributorSummaries ?? []);
        setDistributorUsage(state.distributorUsage ?? []);
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
    void saveAdminModuleState<CouponBackendState>('coupons', {
      coupons,
      campaigns,
      usage,
      settings,
      distributorSummaries,
      distributorUsage,
    });
  }, [coupons, campaigns, usage, settings, distributorSummaries, distributorUsage]);

  const usageForCoupon = useCallback(
    (couponId: string) => usage.filter((u) => u.couponId === couponId),
    [usage],
  );

  const analytics = useMemo(() => {
    const totalRedemptions = usage.length;
    const totalDiscountGiven = usage.reduce((s, u) => s + u.discountAmount, 0);
    const topCoupons = [...coupons]
      .sort((a, b) => b.usedCount - a.usedCount)
      .slice(0, 5)
      .map((c) => ({ code: c.code, usage: c.usedCount, revenue: c.revenueAttributed }));
    return { totalRedemptions, totalDiscountGiven, topCoupons };
  }, [coupons, usage]);

  const addCoupon = useCallback(
    (
      row: Omit<AdminCouponRow, 'couponId' | 'createdAt' | 'usedCount' | 'revenueAttributed'>,
    ) => {
      const id = newId('cpn');
      const next: AdminCouponRow = {
        ...row,
        couponId: id,
        createdAt: new Date().toISOString(),
        usedCount: 0,
        revenueAttributed: 0,
      };
      setCoupons((list) => [next, ...list]);
      return id;
    },
    [],
  );

  const updateCoupon = useCallback((couponId: string, patch: Partial<AdminCouponRow>) => {
    setCoupons((list) => list.map((c) => (c.couponId === couponId ? { ...c, ...patch } : c)));
  }, []);

  const deleteCoupon = useCallback((couponId: string) => {
    setCoupons((list) => list.filter((c) => c.couponId !== couponId));
    setUsage((list) => list.filter((u) => u.couponId !== couponId));
  }, []);

  const toggleCouponDisabled = useCallback((couponId: string) => {
    setCoupons((list) =>
      list.map((c) =>
        c.couponId === couponId
          ? { ...c, status: c.status === 'disabled' ? 'active' : 'disabled' }
          : c,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      coupons,
      setCoupons,
      campaigns,
      setCampaigns,
      usage,
      setUsage,
      settings,
      setSettings,
      distributorSummaries,
      distributorUsage,
      addCoupon,
      updateCoupon,
      deleteCoupon,
      toggleCouponDisabled,
      usageForCoupon,
      analytics,
    }),
    [
      coupons,
      campaigns,
      usage,
      settings,
      distributorSummaries,
      distributorUsage,
      addCoupon,
      updateCoupon,
      deleteCoupon,
      toggleCouponDisabled,
      usageForCoupon,
      analytics,
    ],
  );

  return <CouponContext.Provider value={value}>{children}</CouponContext.Provider>;
}

export function useCoupons(): CouponContextValue {
  const c = useContext(CouponContext);
  if (!c) throw new Error('useCoupons must be used inside CouponProvider');
  return c;
}
