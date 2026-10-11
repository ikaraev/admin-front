import { GripVerticalIcon } from 'lucide-react';
import { widgetTitle } from '../../lib/format';
import { findRow, findWidget, rowWidths } from '../../lib/layout';
import { splitLabel } from '../../lib/presets';
import type { Catalog, LayoutPage } from '../../types/analyticWidgets';
import type { DragData } from './dnd';
import { SplitIcon } from './SplitIcon';

/** What follows the pointer: a compact label, never a real chart. */
export function DragPreview({ active, pages, page, catalog }: { active: DragData; pages: LayoutPage[]; page: LayoutPage; catalog: Catalog }) {
  let label = ''; let detail: string | undefined; let widths: number[] | undefined;
  if (active.type === 'palette' && active.kind === 'metric') { const metric = catalog.get(active.metricKey); label = metric?.label ?? active.metricKey; detail = metric?.group_label; }
  else if (active.type === 'palette' && active.kind === 'row') { widths = active.widths; label = `${splitLabel(active.widths)} row`; }
  else if (active.type === 'widget') { const widget = findWidget(pages, active.widgetId); label = widget ? widgetTitle(widget, catalog) : 'Widget'; }
  else if (active.type === 'row') { const row = findRow(page, active.rowId); widths = row ? rowWidths(row) : undefined; label = `Row ${page.rows.findIndex((item) => item.id === active.rowId) + 1}`; }
  else if (active.type === 'tab') { label = pages.find((item) => item.id === active.pageId)?.title || 'Untitled'; }

  return <div className="flex max-w-64 cursor-grabbing items-center gap-2 rounded-lg border bg-popover px-2.5 py-1.5 text-sm text-popover-foreground shadow-lg">
    <GripVerticalIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
    {widths ? <SplitIcon widths={widths} className="text-muted-foreground" /> : null}
    <span className="truncate font-medium">{label}</span>
    {detail ? <span className="shrink-0 text-xs text-muted-foreground">{detail}</span> : null}
  </div>;
}
