import type { LayoutPage, WidgetDataRequest, WidgetFilters } from '../types/analyticWidgets';
import { pageWidgets } from './layout';

/**
 * The figures request of one page: only what changes figures. Titles, positions and block
 * widths are left out and the widgets are sorted by id, so reordering, resizing, retitling or
 * moving a widget never refetches, while editing a widget's metrics (or their order) does.
 * Settings the server ignores for a display are normalised for the same reason.
 */
export function dataRequest(page: LayoutPage | undefined, filters: WidgetFilters): WidgetDataRequest | null {
  const widgets = pageWidgets(page)
    .map((widget) => ({
      id: widget.id, metrics: widget.metrics, display: widget.display, period: widget.period,
      interval: widget.display === 'trend' ? widget.interval ?? 'day' : null,
      breakdown: widget.display === 'breakdown' ? widget.breakdown : null,
      compare: widget.display === 'number' ? widget.compare : false,
      limit: widget.limit, title: null,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (widgets.length === 0) return null;
  return { from: filters.from, to: filters.to, filters: filters.filters, ...(filters.tz ? { tz: filters.tz } : {}), ...(filters.currency ? { currency: filters.currency } : {}), widgets };
}
