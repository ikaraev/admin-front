import type { FilterValues } from '../../analytics/types/filters';

export type WidgetDisplay = 'number' | 'trend' | 'breakdown';
export type MetricUnit = 'count' | 'money' | 'percent';
export type WidgetPeriod = 'selected' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days'
  | 'last_90_days' | 'month_to_date' | 'year_to_date';
export type WidgetInterval = 'hour' | 'day' | 'week' | 'month';

export interface MetricDefinition {
  key: string; group: string; group_label: string; label: string; description: string;
  unit: MetricUnit; displays: WidgetDisplay[]; breakdowns: { key: string; label: string }[]; current: boolean;
}

export interface Widget {
  id: string; metrics: string[]; display: WidgetDisplay; title: string | null; period: WidgetPeriod;
  interval: WidgetInterval | null; breakdown: string | null; compare: boolean; limit: number;
}
export interface LayoutBlock { width: number; widgets: Widget[] }
export interface LayoutRow { id: string; columns: LayoutBlock[] }
export interface LayoutPage { id: string; title: string; rows: LayoutRow[] }
export interface WidgetLayout { pages: LayoutPage[]; version: number; customized: boolean; saved_at: string | null }

type Base = { metric: string; unit: MetricUnit; currency: string | null };
/** count: number; money: decimal string in major units; percent: decimal string or null. */
export type Value = number | string | null;
export interface NumberFigure extends Base { display: 'number'; value: Value; previous?: Value; previous_period?: { from: string; to: string } | null }
export interface TrendFigure extends Base { display: 'trend'; interval: WidgetInterval; points: { date: string; value: Value }[] }
export interface BreakdownFigure extends Base { display: 'breakdown'; dimension: string; items: { key: string; label: string; value: Value }[] }
export interface MetricError { metric: string; error: { code: string; message: string } }
export type MetricAnswer = NumberFigure | TrendFigure | BreakdownFigure | MetricError;
export const isMetricError = (answer: MetricAnswer): answer is MetricError => 'error' in answer;

export interface WidgetData { results: Record<string, { metrics: MetricAnswer[] }>; currencies: string[]; currency: string | null }
export interface WidgetDataResponse { data: WidgetData; timezone: string | null }

/**
 * The toolbar filters; they apply to every widget of a page and are never saved into the layout.
 * `currency` is the reporting currency (one code); `filters` are the analytics filters, sanitised.
 */
export interface WidgetFilters { from: string; to: string; currency?: string; tz?: string; filters: FilterValues }

export interface WidgetDataRequest {
  from: string; to: string; tz?: string; currency?: string; filters: FilterValues;
  widgets: (Omit<Widget, 'title'> & { title: null })[];
}

export type Catalog = Map<string, MetricDefinition>;
