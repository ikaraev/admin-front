import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { read } from '../../admin/api/adminApi';
import { useAdminScope } from '../../admin/hooks/useScope';
import { refusedKeys } from '../lib/filters';
import type { AnalyticsFilterCatalog } from '../types/filters';

export const analyticsFiltersKey = (scopePath: string) => ['analytics-filters', scopePath] as const;

/** What the caller may narrow and group analytics by. The key includes the scope, so scopes never share it. */
export function useAnalyticsFilters() {
  const { scopePath, me } = useAdminScope();
  return useQuery({
    queryKey: analyticsFiltersKey(scopePath),
    queryFn: () => read<AnalyticsFilterCatalog>(`${scopePath}/analytics/filters`),
    enabled: Boolean(me.data),
    staleTime: 5 * 60_000, // operators and brands change rarely
  });
}

/**
 * When the server refuses a filter it doesn't offer (422 `ANALYTICS_FILTER_NOT_AVAILABLE`), the
 * catalogue is stale: refetch it, clear the refused keys and say so. Each error is handled once,
 * and the cleared state is a new query key, so the same filters are never retried.
 */
export function useClearRefusedFilters(errors: unknown[], onRefused: (keys: string[]) => void) {
  const { scopePath } = useAdminScope();
  const client = useQueryClient();
  const handled = useRef(new WeakSet<object>());
  const latest = useRef(onRefused);
  useEffect(() => { latest.current = onRefused; });

  useEffect(() => {
    for (const error of errors) {
      if (!error || typeof error !== 'object' || handled.current.has(error)) continue;
      const keys = refusedKeys(error);
      if (!keys) continue;
      handled.current.add(error);
      void client.invalidateQueries({ queryKey: analyticsFiltersKey(scopePath) });
      latest.current(keys);
      toast.warning('Some filters are not available here and were cleared');
    }
  }, [errors, client, scopePath]);
}
