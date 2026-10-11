import axios from 'axios';
import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';
import { SubmitButton } from '@/components/common/SubmitButton';
import { TextField } from '@/components/forms/FormFields';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requiredText, useZodForm } from '@/lib/forms';
import { cn } from '@/lib/utils';
import type { ApiFailure } from '../../../api/types';
import { apiErrorMessage } from '../../../api/client';
import { AnalyticsFilterBar } from '../../analytics/components/AnalyticsFilterBar';
import { filterFieldErrors, refusedKeys } from '../../analytics/lib/filters';
import type { AnalyticsFilterCatalog, FilterValues } from '../../analytics/types/filters';
import { formatTime } from '../lib/format';
import type { LayoutPage, WidgetDataResponse, WidgetFilters } from '../types/analyticWidgets';

/** The site header already names the page; `title` is only for customize mode. */
export function WidgetsHeader({ title, customized, children }: { title?: string; customized: boolean; children?: ReactNode }) {
  return <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-2">
    {title ? <h2 className="text-lg font-semibold tracking-tight">{title}</h2> : null}
    {customized ? null : <Badge variant="secondary">Default layout</Badge>}
    {children ? <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div> : null}
  </div>;
}

export function ViewPageTabs({ pages, activePageId, onChange }: { pages: LayoutPage[]; activePageId: string; onChange: (pageId: string) => void }) {
  if (pages.length <= 1) return null;
  return <Tabs value={activePageId} onValueChange={onChange} className="min-w-0">
    <TabsList className="h-auto max-w-full flex-wrap justify-start">
      {pages.map((page) => <TabsTrigger key={page.id} value={page.id} className="max-w-48 flex-none"><span className="truncate">{page.title}</span></TabsTrigger>)}
    </TabsList>
  </Tabs>;
}

const datesSchema = z.object({ from: requiredText('Choose a start date.'), to: requiredText('Choose an end date.') });

/** Server messages about the dates (a 422 at `from`/`to`), shown under the date fields rather than as a page error. */
function dateErrors(error: unknown): string[] {
  if (!axios.isAxiosError<ApiFailure>(error) || error.response?.status !== 422) return [];
  const details = error.response.data?.details ?? {};
  return Object.entries(details).filter(([path]) => path === 'from' || path === 'to' || path === 'tz').flatMap(([, messages]) => messages);
}

interface FiltersBarProps {
  filters: WidgetFilters;
  catalog: AnalyticsFilterCatalog;
  /** Dates and analytics filters are applied together, so the page refetches once. */
  onApply: (applied: { from: string; to: string; filters: FilterValues }) => void;
  onCurrency: (currency: string) => void;
  figures: { data: WidgetDataResponse | undefined; isFetching: boolean; dataUpdatedAt: number; error: unknown; refetch: () => unknown };
}

/**
 * Dates, analytics filters and reporting currency for every widget of the page. Remount it (by
 * `key`) when the applied filters change. Filters are never saved into the layout.
 */
export function FiltersBar({ filters, catalog, onApply, onCurrency, figures }: FiltersBarProps) {
  const form = useZodForm(datesSchema, { from: filters.from, to: filters.to });
  const [draft, setDraft] = useState(filters.filters);
  const fieldErrors = filterFieldErrors(figures.error, catalog);
  const currencies = figures.data?.data.currencies ?? [];
  const currency = filters.currency ?? figures.data?.data.currency ?? undefined;
  const onDates = dateErrors(figures.error);
  // Refused filters are cleared with a toast, and invalid ones are shown on their field.
  const batchError = figures.error && onDates.length === 0 && Object.keys(fieldErrors).length === 0 && !refusedKeys(figures.error) ? apiErrorMessage(figures.error) : null;

  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-end gap-3">
      <form noValidate onSubmit={form.handleSubmit((dates) => onApply({ ...dates, filters: draft }))} className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-end gap-3">
          <TextField control={form.control} name="from" label="From" type="date" className="w-auto" />
          <TextField control={form.control} name="to" label="To" type="date" className="w-auto" />
          <SubmitButton pending={figures.isFetching}>Apply</SubmitButton>
        </div>
        {onDates.length ? <p role="alert" className="text-sm text-destructive">{onDates.join(' ')}</p> : null}
      </form>
      {currencies.length > 1 ? <Select value={currency} onValueChange={onCurrency}>
        <SelectTrigger className="w-28" aria-label="Reporting currency"><SelectValue placeholder="Currency" /></SelectTrigger>
        <SelectContent>{currencies.map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}</SelectContent>
      </Select> : null}
      <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
        {figures.dataUpdatedAt ? <span className="tabular-nums">Updated {formatTime(figures.dataUpdatedAt)}{figures.data?.timezone ? ` · ${figures.data.timezone}` : ''}</span> : null}
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Refresh figures" disabled={figures.isFetching} onClick={() => figures.refetch()}>
          <RefreshCwIcon className={cn(figures.isFetching && 'animate-spin')} />
        </Button>
      </div>
    </div>
    <AnalyticsFilterBar catalog={catalog} value={draft} onChange={setDraft} errors={fieldErrors} />
    {batchError ? <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>The figures could not be loaded.</AlertTitle><AlertDescription>{batchError}</AlertDescription></Alert> : null}
  </div>;
}
