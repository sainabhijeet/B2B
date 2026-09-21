import { useEffect, useMemo, useState } from 'react';
import { fetchSystemActivity, type SystemActivityItem } from '@/lib/adminConsoleApi';
import { activityModules, EMPTY_ACTIVITY_STATS } from '@/lib/systemActivityModels';

export function useSystemActivity() {
  const [events, setEvents] = useState<SystemActivityItem[]>([]);
  const [stats, setStats] = useState(EMPTY_ACTIVITY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchSystemActivity()
      .then((result) => {
        if (!active) return;
        setEvents(result.events);
        setStats(result.stats);
        setError('');
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load activity.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const modules = useMemo(() => activityModules(events), [events]);
  return { events, stats, modules, loading, error };
}
