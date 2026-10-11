import { useQueryClient } from '@tanstack/react-query';
import { PencilIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorState } from '@/components/feedback/QueryState';
import { Button } from '@/components/ui/button';
import { apiErrorMessage } from '../../../api/client';
import { useAdminScope } from '../../admin/hooks/useScope';
import { WidgetBuilder, type BuilderExit } from '../components/builder/WidgetBuilder';
import { WidgetPageView, WidgetsSkeleton, type FiguresState } from '../components/view/WidgetPageView';
import { FiltersBar, ViewPageTabs, WidgetsHeader } from '../components/WidgetsToolbar';
import { usePageFigures } from '../hooks/useWidgetData';
import { useWidgetLayout } from '../hooks/useWidgetLayout';
import { useWidgetMetrics, widgetKeys } from '../hooks/useWidgetMetrics';
import { useWidgetPermissions } from '../hooks/useWidgetPermissions';
import { findPage } from '../lib/layout';
import { useAnalyticsFilters } from '../../analytics/hooks/useAnalyticsFilters';
import { omitKeys, readFromSearch, sanitizeFilters, writeToSearch } from '../../analytics/lib/filters';
import type { AnalyticsFilterCatalog, FilterValues } from '../../analytics/types/filters';
import type { Catalog, LayoutPage, WidgetFilters } from '../types/analyticWidgets';

const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** The last 7 days, today included, like the existing analytics page. */
function lastSevenDays(): Pick<WidgetFilters, 'from' | 'to'> {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  return { from: isoDate(from), to: isoDate(today) };
}

/** The analytic widgets with their filters and, with the manage permission, the builder. Shown as the dashboard. */
export function AnalyticWidgetsPage() {
  const { scopePath } = useAdminScope();
  const client = useQueryClient();
  const { canManage } = useWidgetPermissions();
  const layout = useWidgetLayout();
  const metrics = useWidgetMetrics();
  const filterCatalog = useAnalyticsFilters();
  const [dates, setDates] = useState<Omit<WidgetFilters, 'filters'>>(lastSevenDays);
  // Null until the user applies something: the analytics filters then come from the URL.
  const [chosen, setChosen] = useState<FilterValues | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [customizing, setCustomizing] = useState(false);
  const catalogData = filterCatalog.data;
  // Sanitised against the catalogue before every request, so a URL from another scope just loses what doesn't apply here.
  const values = useMemo(() => (catalogData ? sanitizeFilters(chosen ?? readFromSearch(searchParams, catalogData), catalogData) : null), [catalogData, chosen, searchParams]);
  const filters = useMemo<WidgetFilters | null>(() => (values ? { ...dates, filters: values } : null), [dates, values]);

  const writeUrl = useCallback((update: (params: URLSearchParams) => void) => setSearchParams((params) => { update(params); return params; }, { replace: true }), [setSearchParams]);
  const changeFilters = useCallback((next: WidgetFilters, url: boolean) => {
    const { filters: nextValues, ...nextDates } = next;
    setDates(nextDates); setChosen(nextValues);
    // Not while customizing: the leave guard would take our own URL change for navigation.
    if (url && catalogData) writeUrl((params) => writeToSearch(params, nextValues, catalogData));
  }, [catalogData, writeUrl]);

  const pages = layout.data?.pages ?? [];
  const activePage = findPage(pages, searchParams.get('page')) ?? pages[0];

  const setPage = useCallback((pageId: string) => writeUrl((params) => params.set('page', pageId)), [writeUrl]);

  const exitBuilder = useCallback(({ pageId, reload }: BuilderExit) => {
    setCustomizing(false);
    if (reload) void client.invalidateQueries({ queryKey: widgetKeys.layout(scopePath) });
    writeUrl((params) => {
      if (pageId) params.set('page', pageId);
      if (catalogData && values) writeToSearch(params, values, catalogData);
    });
  }, [client, scopePath, writeUrl, catalogData, values]);

  if (layout.isError) return <ErrorWithRetry title="Unable to load your widgets" error={layout.error} onRetry={() => layout.refetch()} />;
  if (metrics.isError) return <ErrorWithRetry title="Unable to load the metric catalog" error={metrics.error} onRetry={() => metrics.refetch()} />;
  if (filterCatalog.isError) return <ErrorWithRetry title="Unable to load the analytics filters" error={filterCatalog.error} onRetry={() => filterCatalog.refetch()} />;
  // The figures wait for the filter catalogue, so no request goes out with unsanitised URL values.
  if (!layout.data || !metrics.data || !activePage || !catalogData || !filters) return <WidgetsSkeleton />;

  if (customizing) {
    return <WidgetBuilder layout={layout.data} catalog={metrics.catalog} activePageId={activePage.id} filters={filters} filterCatalog={catalogData} onFiltersChange={(next) => changeFilters(next, false)} onExit={exitBuilder} />;
  }

  return <div className="flex flex-col gap-4">
    <WidgetsHeader customized={layout.data.customized}>
      {canManage ? <Button type="button" variant="outline" onClick={() => setCustomizing(true)}><PencilIcon />Customize</Button> : null}
    </WidgetsHeader>
    <ViewPageTabs pages={pages} activePageId={activePage.id} onChange={setPage} />
    <PageFigures filters={filters} filterCatalog={catalogData} onFiltersChange={(next) => changeFilters(next, true)} page={activePage} catalog={metrics.catalog} />
  </div>;
}

function PageFigures({ page, catalog, filters, filterCatalog, onFiltersChange }: { page: LayoutPage; catalog: Catalog; filters: WidgetFilters; filterCatalog: AnalyticsFilterCatalog; onFiltersChange: (filters: WidgetFilters) => void }) {
  const figures = usePageFigures(page, filters, (keys) => onFiltersChange({ ...filters, filters: omitKeys(filters.filters, keys) }));
  const state = useMemo<FiguresState>(() => ({ data: figures.data, failed: figures.failed, onRetry: figures.onRetry }), [figures.data, figures.failed, figures.onRetry]);
  return <>
    <FiltersBar key={JSON.stringify([filters.from, filters.to, filters.filters])} filters={filters} catalog={filterCatalog} figures={figures.query}
      onApply={(applied) => onFiltersChange({ ...filters, ...applied })} onCurrency={(currency) => onFiltersChange({ ...filters, currency })} />
    <WidgetPageView page={page} catalog={catalog} figures={state} />
  </>;
}

function ErrorWithRetry({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  return <div className="flex flex-col items-start gap-3">
    <ErrorState title={title} message={apiErrorMessage(error)} />
    <Button type="button" variant="outline" onClick={onRetry}>Retry</Button>
  </div>;
}
