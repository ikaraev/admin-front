import { useMemo } from 'react';
import { toast } from 'sonner';
import {
  addMetricToWidget, canAddMetric, canAddRow, canCreateWidget, countMetrics, countWidgets, duplicateRow, REFUSALS, findWidget, insertRow, insertWidget, locateWidget,
  newRow, newWidget, removeRow, removeWidget, resplitRow,
} from '../../lib/layout';
import { METRICS_PER_PAGE_MAX, WIDGETS_PER_PAGE_MAX } from '../../lib/limits';
import { FULL_ROW } from '../../lib/presets';
import { useBuilder } from './WidgetBuilderProvider';

const refuse = (message: string) => toast.error(message);

/** Click-to-add and the other non-drag edits of the canvas, with their refusals and toasts. */
export function useBuilderActions() {
  const { state, catalog, activePage, edit } = useBuilder();
  const { selection, pages } = state;

  return useMemo(() => ({
    /** Adds a metric to the selected widget when it fits, else to the selected block, else in a new Full row. */
    addMetric(metricKey: string) {
      const metric = catalog.get(metricKey);
      if (!metric) return;
      const selectedWidget = selection?.kind === 'widget' ? findWidget(pages, selection.widgetId) : undefined;
      if (selectedWidget && canAddMetric(selectedWidget, metric, activePage, catalog) === true) {
        edit((current) => addMetricToWidget(current, selectedWidget.id, metric.key, catalog), 'all');
        return;
      }
      const allowed = canCreateWidget(activePage);
      if (allowed !== true) { refuse(allowed); return; }
      const widget = newWidget(metric);
      const at = selection?.kind === 'widget' ? locateWidget([activePage], selection.widgetId) : null;
      const block = at ? { rowId: at.rowId, blockIndex: at.blockIndex } : selection?.kind === 'block' ? selection : null;
      const target = block ? activePage.rows.find((row) => row.id === block.rowId)?.columns[block.blockIndex] : undefined;
      if (block && target) {
        edit((current) => insertWidget(current, widget, { pageId: activePage.id, rowId: block.rowId, blockIndex: block.blockIndex, index: target.widgets.length }), 'all', { select: { kind: 'widget', widgetId: widget.id } });
        return;
      }
      const rows = canAddRow(activePage);
      if (rows !== true) { refuse(rows); return; }
      edit((current) => insertRow(current, activePage.id, newRow(FULL_ROW, [widget]), activePage.rows.length), 'all', { select: { kind: 'widget', widgetId: widget.id } });
    },
    addRow(widths: number[]) {
      const allowed = canAddRow(activePage);
      if (allowed !== true) { refuse(allowed); return; }
      const row = newRow(widths);
      edit((current) => insertRow(current, activePage.id, row, activePage.rows.length), 'all', { select: { kind: 'row', rowId: row.id } });
    },
    removeWidget: (widgetId: string) => edit((current) => removeWidget(current, widgetId), 'all'),
    removeRow: (rowId: string) => edit((current) => removeRow(current, activePage.id, rowId), 'all'),
    duplicateRow(rowId: string) {
      const row = activePage.rows.find((item) => item.id === rowId);
      if (!row) return;
      const copy = { id: row.id, title: '', rows: [row] };
      const allowed = canAddRow(activePage);
      if (allowed !== true) { refuse(allowed); return; }
      if (countWidgets(activePage) + countWidgets(copy) > WIDGETS_PER_PAGE_MAX) { refuse(REFUSALS.widgetsFull); return; }
      if (countMetrics(activePage) + countMetrics(copy) > METRICS_PER_PAGE_MAX) { refuse(REFUSALS.metricsFull); return; }
      edit((current) => duplicateRow(current, activePage.id, rowId), 'all');
    },
    resplit(rowId: string, widths: number[]) {
      const row = activePage.rows.find((item) => item.id === rowId);
      if (!row) return;
      // Widgets of removed blocks move to the end of the last remaining one; none is ever dropped.
      const moved = row.columns.slice(widths.length).reduce((sum, block) => sum + block.widgets.length, 0);
      edit((current) => resplitRow(current, activePage.id, rowId, widths).pages, widths.length === row.columns.length ? { rowId } : 'all');
      if (moved > 0) toast(`Moved ${moved} ${moved === 1 ? 'widget' : 'widgets'} into block ${widths.length}`);
    },
  }), [catalog, selection, pages, activePage, edit]);
}
