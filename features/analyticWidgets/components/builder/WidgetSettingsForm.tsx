import { ArrowDownIcon, ArrowUpIcon, XIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmButton';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { generatedTitle, INTERVAL_LABELS, INTERVALS, metricLabel, PERIOD_LABELS, PERIODS } from '../../lib/format';
import { canAddMetric, fitToMetrics, replaceWidget, sharedDisplays } from '../../lib/layout';
import { LIMIT_MAX, LIMIT_MIN, METRICS_PER_WIDGET_MAX, WIDGET_TITLE_MAX } from '../../lib/limits';
import type { MetricDefinition, Widget, WidgetDisplay, WidgetInterval, WidgetPeriod } from '../../types/analyticWidgets';
import { Stepper } from './Stepper';
import { useBuilder } from './WidgetBuilderProvider';

const DISPLAY_LABELS: Record<WidgetDisplay, string> = { number: 'Number', trend: 'Trend', breakdown: 'Breakdown' };
const KNOWN_FIELDS = new Set(['metrics', 'display', 'period', 'interval', 'breakdown', 'compare', 'title', 'limit']);
const asErrors = (messages: string[] | undefined) => messages?.map((message) => ({ message }));

/** The selected widget's settings. Changes apply to the working copy as they are made; there is no Apply button. */
export function WidgetSettingsForm({ widget }: { widget: Widget }) {
  const { catalog, activePage, errors, locked, edit } = useBuilder();
  const id = useId();
  const [confirmBreakdown, setConfirmBreakdown] = useState(false);
  const fieldErrors = errors.widgets.get(widget.id) ?? new Map<string, string[]>();
  const otherErrors = [...fieldErrors].filter(([field]) => !KNOWN_FIELDS.has(field) && !/^metrics\.\d+$/.test(field)).flatMap(([, messages]) => messages);
  const metrics = widget.metrics.map((key) => catalog.get(key));
  const current = metrics.some((metric) => metric?.current);
  const displays = sharedDisplays(widget.metrics, catalog);

  /** Every change runs through fitToMetrics, so the widget stays valid for each of its metrics. */
  const change = (patch: Partial<Widget>) => edit((pages) => replaceWidget(pages, fitToMetrics({ ...widget, ...patch }, catalog)), { widgetId: widget.id });
  const move = (from: number, to: number) => { const next = [...widget.metrics]; const [key] = next.splice(from, 1); next.splice(to, 0, key); change({ metrics: next }); };
  const setDisplay = (display: string) => {
    if (!display || display === widget.display) return;
    if (display === 'breakdown' && widget.metrics.length > 1) { setConfirmBreakdown(true); return; }
    change({ display: display as WidgetDisplay });
  };

  const groups = new Map<string, { label: string; options: { metric: MetricDefinition; reason: string | null }[] }>();
  for (const metric of catalog.values()) {
    if (widget.metrics.includes(metric.key) || !metric.displays.includes(widget.display)) continue;
    const allowed = canAddMetric(widget, metric, activePage, catalog);
    const group = groups.get(metric.group) ?? { label: metric.group_label, options: [] };
    group.options.push({ metric, reason: allowed === true ? null : allowed });
    groups.set(metric.group, group);
  }
  const breakdowns = metrics[0]?.breakdowns ?? [];
  const canAddMore = widget.display !== 'breakdown' && widget.metrics.length < METRICS_PER_WIDGET_MAX;

  return <fieldset disabled={locked} className="min-w-0"><FieldGroup className="gap-5">
    {otherErrors.length ? <FieldError errors={asErrors(otherErrors)} /> : null}

    <Field>
      <FieldLabel>Metrics</FieldLabel>
      <FieldError errors={asErrors(fieldErrors.get('metrics'))} />
      <ol className="flex flex-col gap-1">
        {widget.metrics.map((key, i) => <li key={key} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 rounded-md border bg-muted/30 py-0.5 pr-0.5 pl-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{metricLabel(key, catalog)}</span>
            {widget.metrics.length > 1 ? <>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`Move ${metricLabel(key, catalog)} up`} disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUpIcon /></Button>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`Move ${metricLabel(key, catalog)} down`} disabled={i === widget.metrics.length - 1} onClick={() => move(i, i + 1)}><ArrowDownIcon /></Button>
            </> : null}
            <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${metricLabel(key, catalog)}`} disabled={widget.metrics.length <= 1} onClick={() => change({ metrics: widget.metrics.filter((item) => item !== key) })}><XIcon /></Button>
          </div>
          <FieldError className="text-xs" errors={asErrors(fieldErrors.get(`metrics.${i}`))} />
        </li>)}
      </ol>
      {canAddMore ? <Select value="" onValueChange={(key) => change({ metrics: [...widget.metrics, key] })}>
        <SelectTrigger size="sm" className="w-full" aria-label="Add metric"><SelectValue placeholder="+ Add metric" /></SelectTrigger>
        <SelectContent>
          {[...groups.values()].map((group) => <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.options.map(({ metric, reason }) => <SelectItem key={metric.key} value={metric.key} disabled={reason !== null}>
              <span className="flex flex-col"><span>{metric.label}</span>{reason ? <span className="text-xs text-muted-foreground">{reason}</span> : null}</span>
            </SelectItem>)}
          </SelectGroup>)}
        </SelectContent>
      </Select> : null}
      <div className="flex flex-col gap-1.5 pt-1">
        {metrics.map((metric, i) => metric ? <FieldDescription key={metric.key} className="text-xs"><span className="font-medium text-foreground">{metric.label}.</span> {metric.description}</FieldDescription>
          : <FieldDescription key={widget.metrics[i]} className="text-xs">{widget.metrics[i]} is not in the metric catalog any more. Remove it.</FieldDescription>)}
      </div>
    </Field>

    <Field>
      <FieldLabel id={`${id}-display`}>Show as</FieldLabel>
      <ToggleGroup type="single" variant="outline" size="sm" value={widget.display} onValueChange={setDisplay} aria-labelledby={`${id}-display`}>
        {displays.map((display) => <ToggleGroupItem key={display} value={display} className="flex-1">{DISPLAY_LABELS[display]}</ToggleGroupItem>)}
      </ToggleGroup>
      <FieldError errors={asErrors(fieldErrors.get('display'))} />
    </Field>

    {current ? null : <Field>
      <FieldLabel htmlFor={`${id}-period`}>Period</FieldLabel>
      <Select value={widget.period} onValueChange={(period) => change({ period: period as WidgetPeriod })}>
        <SelectTrigger id={`${id}-period`} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{PERIODS.map((period) => <SelectItem key={period} value={period}>{PERIOD_LABELS[period]}</SelectItem>)}</SelectContent>
      </Select>
      <FieldError errors={asErrors(fieldErrors.get('period'))} />
    </Field>}

    {widget.display === 'trend' ? <Field>
      <FieldLabel htmlFor={`${id}-interval`}>Interval</FieldLabel>
      <Select value={widget.interval ?? 'day'} onValueChange={(interval) => change({ interval: interval as WidgetInterval })}>
        <SelectTrigger id={`${id}-interval`} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{INTERVALS.map((interval) => <SelectItem key={interval} value={interval}>{INTERVAL_LABELS[interval]}</SelectItem>)}</SelectContent>
      </Select>
      <FieldError errors={asErrors(fieldErrors.get('interval'))} />
    </Field> : null}

    {widget.display === 'breakdown' ? <>
      <Field>
        <FieldLabel htmlFor={`${id}-breakdown`}>Breakdown</FieldLabel>
        <Select value={widget.breakdown ?? undefined} onValueChange={(breakdown) => change({ breakdown })}>
          <SelectTrigger id={`${id}-breakdown`} className="w-full"><SelectValue placeholder="Pick a dimension" /></SelectTrigger>
          <SelectContent>{breakdowns.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
        <FieldError errors={asErrors(fieldErrors.get('breakdown'))} />
      </Field>
      <Field orientation="horizontal">
        <FieldLabel>Rows shown</FieldLabel>
        <Stepper label="Rows shown" value={widget.limit} min={LIMIT_MIN} max={LIMIT_MAX} onChange={(limit) => change({ limit })} />
        <FieldError errors={asErrors(fieldErrors.get('limit'))} />
      </Field>
    </> : null}

    {widget.display === 'number' && !current ? <Field orientation="horizontal">
      <FieldLabel htmlFor={`${id}-compare`}>Compare with the previous period</FieldLabel>
      <Switch id={`${id}-compare`} checked={widget.compare} onCheckedChange={(compare) => change({ compare })} />
    </Field> : null}

    <Field>
      <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
      <Input id={`${id}-title`} value={widget.title ?? ''} maxLength={WIDGET_TITLE_MAX} placeholder={generatedTitle(widget, catalog)}
        onChange={(event) => change({ title: event.target.value === '' ? null : event.target.value })} />
      {!widget.title?.trim() && widget.metrics.length >= 3 ? <FieldDescription className="text-xs">With {widget.metrics.length} metrics the generated title gets long. A short title reads better.</FieldDescription> : null}
      <FieldError errors={asErrors(fieldErrors.get('title'))} />
    </Field>

    <ConfirmDialog open={confirmBreakdown} onOpenChange={setConfirmBreakdown} title="Breakdown shows one metric"
      description={`Keep only ${metricLabel(widget.metrics[0], catalog)}? The other metrics are removed from this widget.`} confirmLabel={`Keep only ${metricLabel(widget.metrics[0], catalog)}`}
      onConfirm={async () => change({ display: 'breakdown', metrics: widget.metrics.slice(0, 1) })} />
  </FieldGroup></fieldset>;
}
