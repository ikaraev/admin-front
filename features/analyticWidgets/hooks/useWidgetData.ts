import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useAdminScope } from '../../admin/hooks/useScope';
import { getData } from '../api/analyticWidgetsApi';
import { useClearRefusedFilters } from '../../analytics/hooks/useAnalyticsFilters';
import { dataRequest } from '../lib/dataRequest';
import { deepEqual } from '../lib/layout';
import type { LayoutPage, WidgetData, WidgetDataRequest, WidgetDataResponse, WidgetFilters } from '../types/analyticWidgets';
import { widgetKeys } from './useWidgetMetrics';

const FIVE_MINUTES = 5 * 60_000;

/**
 * Figures of one page, in one batch. It is a POST, but it reads, so it is a query. React Query
 * hashes the key by value, so an equal request built on another render hits the same cache entry.
 */
export function useWidgetData(request: WidgetDataRequest | null) {
  const { scopePath, me } = useAdminScope();
  return useQuery({
    queryKey: widgetKeys.data(scopePath, request),
    // The response carries the request it answers, so placeholder results can be matched per widget.
    queryFn: async ({ signal }): Promise<FiguresResponse> => ({ ...(await getData(scopePath, request as WidgetDataRequest, signal)), request: request as WidgetDataRequest }),
    enabled: Boolean(me.data) && request !== null,
    placeholderData: keepPreviousData,
    refetchInterval: FIVE_MINUTES,
    retry: false,
  });
}

export type FiguresResponse = WidgetDataResponse & { request: WidgetDataRequest };

const sameFilters = (a: WidgetDataRequest, b: WidgetDataRequest) => a.from === b.from && a.to === b.to && a.tz === b.tz && a.currency === b.currency && deepEqual(a.filters, b.filters);

/**
 * The figures of a page (the working copy while customizing) under the toolbar filters. While a
 * new batch loads, widgets whose request did not change keep their figures; the others show
 * skeletons. So a dropped metric fills in without blanking the rest of the page.
 */
export function usePageFigures(page: LayoutPage | undefined, filters: WidgetFilters, onRefusedFilters: (keys: string[]) => void) {
  const request = useMemo(() => dataRequest(page, filters), [page, filters]);
  const query = useWidgetData(request);
  useClearRefusedFilters([query.error], onRefusedFilters);
  const { refetch, data: response, isPlaceholderData } = query;
  const onRetry = useCallback(() => { void refetch(); }, [refetch]);
  const data = useMemo((): WidgetData | undefined => {
    if (!response || !request) return undefined;
    if (!isPlaceholderData) return response.data;
    if (!sameFilters(response.request, request)) return { ...response.data, results: {} };
    const previous = new Map(response.request.widgets.map((widget) => [widget.id, widget]));
    const results = Object.fromEntries(request.widgets
      .filter((widget) => response.data.results[widget.id] && deepEqual(previous.get(widget.id), widget))
      .map((widget) => [widget.id, response.data.results[widget.id]]));
    return { ...response.data, results };
  }, [response, request, isPlaceholderData]);
  return { query, data, failed: query.isError && !query.isFetching, onRetry };
}
