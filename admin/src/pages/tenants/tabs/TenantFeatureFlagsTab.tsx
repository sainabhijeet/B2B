import { useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { TenantDetailLoadingGate } from '@/components/tenants/TenantDetailContext';
import {
  FEATURE_GROUP_ORDER,
  PLATFORM_FEATURES,
  createDefaultFeatureState,
} from '@/lib/platformFeatureRegistry';
function demoInitial(): Record<string, boolean> {
  return {
    ...createDefaultFeatureState(),
    customer_specific_pricing: true,
    api_access: true,
    module_analytics: true,
  };
}

export function TenantFeatureFlagsTab() {
  const [state, setState] = useState(demoInitial);

  function toggle(id: string) {
    setState((s) => ({ ...s, [id]: !s[id] }));
  }

  return (
    <TenantDetailLoadingGate>
      {(detail) => (
        <ResourcePanel title="Feature flags (tenant overrides)">
          <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
            <span className="font-medium text-slate-800">{detail.name}</span>
            <span className="mx-1 text-slate-400">·</span>
            <code className="text-[10px]">{detail.id}</code>
            <span className="mx-1 text-slate-400">·</span>
            Plan: {detail.plan?.name ?? '—'}
          </p>
          {FEATURE_GROUP_ORDER.map((group) => {
            const items = PLATFORM_FEATURES.filter((f) => f.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <div className="border-b border-slate-100 bg-slate-50/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  {group}
                </div>
                <ul className="divide-y divide-slate-100">
                  {items.map((f) => (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-start justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">{f.label}</div>
                        {f.description ? (
                          <p className="text-xs text-slate-600">{f.description}</p>
                        ) : null}
                        <code className="mt-0.5 block text-[10px] text-slate-400">{f.id}</code>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!state[f.id]}
                        onClick={() => toggle(f.id)}
                        className={[
                          'relative h-6 w-10 shrink-0 rounded-full transition-colors',
                          state[f.id] ? 'bg-indigo-600' : 'bg-slate-200',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                            state[f.id] ? 'left-4' : 'left-0.5',
                          ].join(' ')}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
            Toggles are session demo. API: plan defaults + tenant overrides from backend.
          </p>
        </ResourcePanel>
      )}
    </TenantDetailLoadingGate>
  );
}
