import type { Catalog, MetricUnit, Value, Widget, WidgetInterval, WidgetPeriod } from '../types/analyticWidgets';

export const PERIOD_LABELS: Record<WidgetPeriod, string> = {
  selected: 'Selected dates', today: 'Today', yesterday: 'Yesterday', last_7_days: 'Last 7 days', last_30_days: 'Last 30 days',
  last_90_days: 'Last 90 days', month_to_date: 'Month to date', year_to_date: 'Year to date',
};
export const PERIODS = Object.keys(PERIOD_LABELS) as WidgetPeriod[];

export const INTERVAL_LABELS: Record<WidgetInterval, string> = { hour: 'Hour', day: 'Day', week: 'Week', month: 'Month' };
export const INTERVALS = Object.keys(INTERVAL_LABELS) as WidgetInterval[];

export const UNIT_LABELS: Record<MetricUnit, string> = { money: 'money', count: 'count', percent: 'percent' };

const formatters = new Map<string, Intl.NumberFormat>();
function formatter(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  let cached = formatters.get(key);
  if (!cached) {
    try { cached = new Intl.NumberFormat(undefined, options); } catch { cached = new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }); }
    formatters.set(key, cached);
  }
  return cached;
}

// Modern Intl formats decimal strings exactly; the ES2020 typings only know numbers.
const formatDecimal = (format: Intl.NumberFormat, value: string | number) => (format.format as (value: string | number) => string)(value);

function currencyDigits(currency: string): number {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions().minimumFractionDigits ?? 0; } catch { return 0; }
}

export const isBlank = (value: Value | undefined): value is null | undefined => value === null || value === undefined || value === '';

/** Formats a figure for its unit. Money arrives in major units already; it is never divided again. */
export function formatValue(value: Value | undefined, unit: MetricUnit, currency: string | null, compact = false): string {
  if (isBlank(value)) return '—';
  if (unit === 'percent') return `${formatter('percent', { maximumFractionDigits: 2 }).format(Number(value))} %`;
  if (unit === 'count') return compact ? formatter('count-compact', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value)) : formatter('count', {}).format(Number(value));
  if (compact) {
    const options: Intl.NumberFormatOptions = { notation: 'compact', maximumFractionDigits: 1, ...(currency ? { style: 'currency', currency } : {}) };
    return formatter(`money-compact-${currency ?? ''}`, options).format(Number(value));
  }
  // At least the currency's usual decimals (€1,250.50), up to 8 for crypto-sized amounts.
  const options: Intl.NumberFormatOptions = currency
    ? { style: 'currency', currency, minimumFractionDigits: currencyDigits(currency), maximumFractionDigits: 8 }
    : { minimumFractionDigits: 0, maximumFractionDigits: 8 };
  return formatDecimal(formatter(`money-${currency ?? ''}`, options), value);
}

/** Change against the previous period as a fraction, or null when there is nothing to compare with. Display only. */
export function change(value: Value | undefined, previous: Value | undefined): number | null {
  if (isBlank(value) || isBlank(previous)) return null;
  const before = Number(previous);
  if (!before || !Number.isFinite(before)) return null;
  return (Number(value) - before) / Math.abs(before);
}

export const formatChange = (ratio: number) => formatter('change', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'never' }).format(Math.abs(ratio));

export const metricLabel = (key: string, catalog: Catalog) => catalog.get(key)?.label ?? key;

export function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

export const generatedTitle = (widget: Pick<Widget, 'metrics'>, catalog: Catalog) => joinLabels(widget.metrics.map((key) => metricLabel(key, catalog)));

export const widgetTitle = (widget: Widget, catalog: Catalog) => widget.title?.trim() || generatedTitle(widget, catalog);

/** "Last 30 days · by day · EUR"; the currency is left out when every metric is a count. */
export function widgetSubtitle(widget: Widget, catalog: Catalog, currency: string | null): string {
  const parts = [PERIOD_LABELS[widget.period]];
  if (widget.display === 'trend') parts.push(`by ${INTERVAL_LABELS[widget.interval ?? 'day'].toLowerCase()}`);
  if (widget.display === 'breakdown' && widget.breakdown) {
    const breakdown = catalog.get(widget.metrics[0])?.breakdowns.find((item) => item.key === widget.breakdown);
    parts.push(`by ${(breakdown?.label ?? widget.breakdown).toLowerCase()}`);
  }
  const hasMoney = widget.metrics.some((key) => catalog.get(key)?.unit === 'money');
  if (hasMoney && currency) parts.push(currency);
  return parts.join(' · ');
}

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });
const hourFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Chart bucket label. Days arrive as YYYY-MM-DD (read as local dates), hours as local timestamps with an offset. */
export function formatBucket(date: string, interval: WidgetInterval): string {
  if (interval === 'hour') {
    // Show the wall-clock time the server sent, not the browser's: keep the local part of the timestamp.
    const local = new Date(date.slice(0, 19));
    return Number.isNaN(local.getTime()) ? date : hourFormat.format(local);
  }
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  if (!year || !month) return date;
  const value = new Date(year, month - 1, day || 1);
  return interval === 'month' ? monthFormat.format(value) : dayFormat.format(value);
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
export const formatTime = (timestamp: number) => timeFormat.format(new Date(timestamp));
