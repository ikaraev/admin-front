import { useMemo, useState, type CSSProperties } from 'react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { formatBucket, formatValue, metricLabel } from '../../lib/format';
import { isMetricError, type Catalog, type MetricAnswer, type MetricUnit, type TrendFigure as TrendAnswer, type WidgetInterval } from '../../types/analyticWidgets';
import { MetricErrorNote } from './MetricErrorNote';

// The theme's chart palette is a neutral scale: darkest first, and later series are dashed so they stay apart.
const SERIES_COLORS = ['var(--chart-4)', 'var(--chart-2)', 'var(--chart-1)', 'var(--chart-5)', 'var(--chart-3)', 'var(--chart-2)'];
const dashFor = (index: number) => (index >= 3 ? '4 3' : undefined);

type Series = { key: string; answer: TrendAnswer; label: string; axis: 'left' | 'right' };
type Row = Record<string, string | number | null>;

const toNumber = (value: TrendAnswer['points'][number]['value']) => (value === null || value === '' ? null : Number(value));

/**
 * A widget's trend: one area for one metric, lines for several (GGR is not turnover plus payouts).
 * The first metric's unit uses the left axis, a second unit the right one. Nulls are gaps, never 0.
 */
export function TrendFigure({ answers, catalog, height, onRetry }: { answers: MetricAnswer[]; catalog: Catalog; height: number; onRetry?: () => void }) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const { series, rows, errors, units, interval } = useMemo(() => {
    const trends = answers.filter((answer): answer is TrendAnswer => !isMetricError(answer) && answer.display === 'trend');
    const leftUnit = trends[0]?.unit;
    const list: Series[] = answers.flatMap((answer, index) => (!isMetricError(answer) && answer.display === 'trend'
      ? [{ key: `m${index}`, answer, label: metricLabel(answer.metric, catalog), axis: answer.unit === leftUnit ? 'left' as const : 'right' as const }] : []));
    // All metrics of a widget share the period and interval, so their dates line up.
    const byDate = new Map<string, Row>();
    for (const item of list) {
      for (const point of item.answer.points) {
        const row = byDate.get(point.date) ?? { date: point.date };
        row[item.key] = toNumber(point.value);
        byDate.set(point.date, row);
      }
    }
    const unitOf = (axis: 'left' | 'right') => list.find((item) => item.axis === axis)?.answer;
    return {
      series: list, rows: [...byDate.values()], errors: answers.filter(isMetricError),
      units: { left: unitOf('left'), right: unitOf('right') },
      interval: (trends[0]?.interval ?? 'day') as WidgetInterval,
    };
  }, [answers, catalog]);

  const config = useMemo(() => Object.fromEntries(series.map((item, i) => [item.key, { label: item.label, color: SERIES_COLORS[i % SERIES_COLORS.length] }])) satisfies ChartConfig, [series]);
  const toggle = (key: string) => setHidden((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const bucket = (value: unknown) => formatBucket(String(value), interval);
  const axisFormat = (answer?: TrendAnswer) => (value: number) => (answer ? formatValue(value, answer.unit as MetricUnit, answer.currency, true) : String(value));
  const single = series.length === 1;

  return <div className="flex flex-col gap-2">
    {series.length > 0 ? <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      {single ? <AreaChart data={rows} margin={{ left: 0, right: 4 }}>
        <defs><linearGradient id={`fill-${series[0].key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={`var(--color-${series[0].key})`} stopOpacity={0.5} /><stop offset="95%" stopColor={`var(--color-${series[0].key})`} stopOpacity={0.05} /></linearGradient></defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={bucket} />
        <YAxis yAxisId="left" tickLine={false} axisLine={false} width={56} tickFormatter={axisFormat(units.left)} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={bucket} formatter={tooltipRow(config, series)} indicator="dot" />} />
        <Area yAxisId="left" dataKey={series[0].key} type="monotone" stroke={`var(--color-${series[0].key})`} fill={`url(#fill-${series[0].key})`} strokeWidth={2} connectNulls={false} isAnimationActive={false} />
      </AreaChart> : <LineChart data={rows} margin={{ left: 0, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={bucket} />
        <YAxis yAxisId="left" tickLine={false} axisLine={false} width={56} tickFormatter={axisFormat(units.left)} />
        {units.right ? <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={56} tickFormatter={axisFormat(units.right)} /> : null}
        <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={bucket} formatter={tooltipRow(config, series)} indicator="dot" />} />
        {series.map((item, i) => <Line key={item.key} yAxisId={item.axis} dataKey={item.key} hide={hidden.has(item.key)} type="monotone" stroke={`var(--color-${item.key})`} strokeWidth={2} strokeDasharray={dashFor(i)} dot={false} connectNulls={false} isAnimationActive={false} />)}
      </LineChart>}
    </ChartContainer> : null}
    {series.length > 1 ? <div className="flex flex-wrap justify-center gap-1" role="group" aria-label="Series">
      {series.map((item, i) => <button key={item.key} type="button" aria-pressed={!hidden.has(item.key)} onClick={() => toggle(item.key)}
        className={cn('inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs outline-none transition-opacity duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50', hidden.has(item.key) && 'opacity-40')}>
        <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length], ...(dashFor(i) ? { background: `repeating-linear-gradient(90deg, ${SERIES_COLORS[i % SERIES_COLORS.length]} 0 3px, transparent 3px 5px)` } : {}) }} />
        {item.label}
      </button>)}
    </div> : null}
    {errors.map((answer) => <MetricErrorNote key={answer.metric} answer={answer} label={metricLabel(answer.metric, catalog)} onRetry={onRetry} />)}
  </div>;
}

/** Tooltip row in the shadcn style, each value formatted for its own unit. */
function tooltipRow(config: ChartConfig, series: Series[]) {
  return (value: unknown, name: unknown) => {
    const item = series.find((entry) => entry.key === String(name));
    return <div className="flex w-full items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-[2px] bg-(--color-bg)" style={{ '--color-bg': `var(--color-${String(name)})` } as CSSProperties} />
      <span className="text-muted-foreground">{config[String(name)]?.label ?? String(name)}</span>
      <span className="ml-auto pl-2 font-mono font-medium text-foreground tabular-nums">{item ? formatValue(value as number | null, item.answer.unit, item.answer.currency) : String(value)}</span>
    </div>;
  };
}
