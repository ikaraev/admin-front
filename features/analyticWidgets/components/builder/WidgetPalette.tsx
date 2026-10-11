import { SearchIcon } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { UNIT_LABELS } from '../../lib/format';
import { canAddRow, canCreateWidget } from '../../lib/layout';
import { SPLIT_PRESETS } from '../../lib/presets';
import type { MetricDefinition } from '../../types/analyticWidgets';
import { paletteMetricId, paletteRowId } from './dnd';
import { PaletteItem } from './PaletteItem';
import { SplitIcon } from './SplitIcon';
import { useBuilderActions } from './useBuilderActions';
import { useBuilder } from './WidgetBuilderProvider';

function SectionTitle({ children }: { children: string }) {
  return <h3 className="px-1.5 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</h3>;
}

/** Row presets and the metric catalog, grouped in catalog order. Built from `GET analytics/metrics`; no metric is hard-coded. */
export function WidgetPalette() {
  const { catalog, activePage, locked } = useBuilder();
  const actions = useBuilderActions();
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search.trim().toLowerCase());
  const rowRefusal = locked ? 'Saving…' : canAddRow(activePage);
  const metricRefusal = locked ? 'Saving…' : canCreateWidget(activePage);

  const groups = useMemo(() => {
    const result: { key: string; label: string; metrics: MetricDefinition[] }[] = [];
    for (const metric of catalog.values()) {
      if (query && !metric.label.toLowerCase().includes(query)) continue;
      const group = result.find((item) => item.key === metric.group);
      if (group) group.metrics.push(metric); else result.push({ key: metric.group, label: metric.group_label, metrics: [metric] });
    }
    return result;
  }, [catalog, query]);

  return <div className="flex flex-col">
    <div className="relative px-1">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search metrics" aria-label="Search metrics" className="pl-8" />
    </div>
    {query ? null : <section aria-label="Rows">
      <SectionTitle>Rows</SectionTitle>
      {SPLIT_PRESETS.map((preset) => <PaletteItem key={preset.key} id={paletteRowId(preset.widths)} data={{ type: 'palette', kind: 'row', widths: preset.widths }}
        label={preset.label} icon={<SplitIcon widths={preset.widths} className="text-muted-foreground" />} disabledReason={rowRefusal === true ? null : rowRefusal}
        addLabel={`Add a ${preset.label} row`} onAdd={() => actions.addRow(preset.widths)} />)}
    </section>}
    {groups.map((group) => <section key={group.key} aria-label={group.label}>
      <SectionTitle>{group.label}</SectionTitle>
      {group.metrics.map((metric) => <PaletteItem key={metric.key} id={paletteMetricId(metric.key)} data={{ type: 'palette', kind: 'metric', metricKey: metric.key }}
        label={metric.label} detail={UNIT_LABELS[metric.unit]} disabledReason={metricRefusal === true ? null : metricRefusal}
        addLabel={`Add ${metric.label}`} onAdd={() => actions.addMetric(metric.key)} />)}
    </section>)}
    {groups.length === 0 ? <p className="px-1.5 py-4 text-sm text-muted-foreground">No metric matches “{search.trim()}”.</p> : null}
  </div>;
}
