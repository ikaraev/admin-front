import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAdminScope } from '../../admin/hooks/useScope';
import { getMetrics } from '../api/analyticWidgetsApi';
import type { Catalog } from '../types/analyticWidgets';

export const widgetKeys = {
  all: (scopePath: string) => ['analytic-widgets', scopePath] as const,
  metrics: (scopePath: string) => ['analytic-widgets', scopePath, 'metrics'] as const,
  layout: (scopePath: string) => ['analytic-widgets', scopePath, 'layout'] as const,
  data: (scopePath: string, request: unknown) => ['analytic-widgets', scopePath, 'data', request] as const,
};

/** The metric catalog; it only changes with a deploy. */
export function useWidgetMetrics() {
  const { scopePath, me } = useAdminScope();
  const query = useQuery({ queryKey: widgetKeys.metrics(scopePath), queryFn: () => getMetrics(scopePath), staleTime: Infinity, enabled: Boolean(me.data) });
  const catalog: Catalog = useMemo(() => new Map((query.data ?? []).map((metric) => [metric.key, metric])), [query.data]);
  return { ...query, catalog };
}
