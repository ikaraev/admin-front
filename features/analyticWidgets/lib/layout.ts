/**
 * Pure, immutable operations on the pages of a widget layout. Every function returns the
 * same reference when nothing changes, so the dirty check and memoised cards stay cheap.
 */
import type { Catalog, LayoutBlock, LayoutPage, LayoutRow, MetricDefinition, MetricUnit, Widget, WidgetDisplay } from '../types/analyticWidgets';
import {
  BLOCK_WIDTH_MAX, BLOCK_WIDTH_MIN, LIMIT_DEFAULT, METRICS_PER_PAGE_MAX, METRICS_PER_WIDGET_MAX, PAGE_TITLE_MAX, PAGES_MAX,
  ROW_BLOCKS_MAX, ROW_WIDTH, ROWS_MAX, TREND_UNITS_MAX, WIDGETS_PER_PAGE_MAX,
} from './limits';

export type WidgetLocation = { pageId: string; rowId: string; blockIndex: number; index: number };

export const newId = () => crypto.randomUUID();

const replaceAt = <T,>(items: T[], index: number, item: T) => (items[index] === item ? items : items.map((current, i) => (i === index ? item : current)));
const insertAt = <T,>(items: T[], index: number, item: T) => [...items.slice(0, index), item, ...items.slice(index)];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const moveItem = <T,>(items: T[], from: number, to: number) => {
  if (from === to) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  const left = a as Record<string, unknown>; const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => key in right && deepEqual(left[key], right[key]));
}

// ---- Traversal ----

function mapPage(pages: LayoutPage[], pageId: string, fn: (page: LayoutPage) => LayoutPage): LayoutPage[] {
  const index = pages.findIndex((page) => page.id === pageId);
  return index < 0 ? pages : replaceAt(pages, index, fn(pages[index]));
}

function mapRows(page: LayoutPage, fn: (rows: LayoutRow[]) => LayoutRow[]): LayoutPage {
  const rows = fn(page.rows);
  return rows === page.rows ? page : { ...page, rows };
}

function mapBlock(pages: LayoutPage[], pageId: string, rowId: string, blockIndex: number, fn: (widgets: Widget[]) => Widget[]): LayoutPage[] {
  return mapPage(pages, pageId, (page) => mapRows(page, (rows) => {
    const r = rows.findIndex((row) => row.id === rowId);
    const block = rows[r]?.columns[blockIndex];
    if (!block) return rows;
    const widgets = fn(block.widgets);
    if (widgets === block.widgets) return rows;
    return replaceAt(rows, r, { ...rows[r], columns: replaceAt(rows[r].columns, blockIndex, { ...block, widgets }) });
  }));
}

export const findPage = (pages: LayoutPage[], pageId: string | null | undefined) => pages.find((page) => page.id === pageId);
export const findRow = (page: LayoutPage | undefined, rowId: string) => page?.rows.find((row) => row.id === rowId);
export const pageWidgets = (page: LayoutPage | undefined): Widget[] => page?.rows.flatMap((row) => row.columns.flatMap((block) => block.widgets)) ?? [];
export const rowWidgetCount = (row: LayoutRow) => row.columns.reduce((sum, block) => sum + block.widgets.length, 0);
export const pageWidgetCount = (page: LayoutPage) => page.rows.reduce((sum, row) => sum + rowWidgetCount(row), 0);
export const rowWidths = (row: LayoutRow) => row.columns.map((block) => block.width);
export const rowWidth = (row: LayoutRow) => row.columns.reduce((sum, block) => sum + block.width, 0);

export function locateWidget(pages: LayoutPage[], widgetId: string): WidgetLocation | null {
  for (const page of pages) {
    for (const row of page.rows) {
      for (let blockIndex = 0; blockIndex < row.columns.length; blockIndex++) {
        const index = row.columns[blockIndex].widgets.findIndex((widget) => widget.id === widgetId);
        if (index >= 0) return { pageId: page.id, rowId: row.id, blockIndex, index };
      }
    }
  }
  return null;
}

export function findWidget(pages: LayoutPage[], widgetId: string): Widget | undefined {
  const at = locateWidget(pages, widgetId);
  if (!at) return undefined;
  return findRow(findPage(pages, at.pageId), at.rowId)?.columns[at.blockIndex].widgets[at.index];
}

export const pageOfRow = (pages: LayoutPage[], rowId: string) => pages.find((page) => page.rows.some((row) => row.id === rowId));

// ---- Counting and rules ----

export const countWidgets = (page: LayoutPage | undefined) => (page ? pageWidgetCount(page) : 0);
export const countMetrics = (page: LayoutPage | undefined) => pageWidgets(page).reduce((sum, widget) => sum + widget.metrics.length, 0);

export function trendUnits(widget: Pick<Widget, 'metrics'>, catalog: Catalog): Set<MetricUnit> {
  const units = new Set<MetricUnit>();
  for (const key of widget.metrics) { const unit = catalog.get(key)?.unit; if (unit) units.add(unit); }
  return units;
}

export const REFUSALS = {
  rowInBlock: 'A row cannot go inside a block',
  widgetsFull: `A page holds at most ${WIDGETS_PER_PAGE_MAX} widgets. Remove one first.`,
  metricsFull: `A page holds at most ${METRICS_PER_PAGE_MAX} metrics. Remove one first.`,
  rowsFull: `A page holds at most ${ROWS_MAX} rows. Remove one first.`,
  breakdownOne: 'A breakdown shows one metric',
  widgetFull: `A widget holds at most ${METRICS_PER_WIDGET_MAX} metrics`,
  alreadyIn: 'Already in this widget',
  twoUnits: 'A chart has room for two units',
  unsupported: 'This metric cannot be shown this way',
} as const;

/** The single source for "can this metric join this widget": the palette, the drop target and the inspector use it. */
export function canAddMetric(widget: Widget, metric: MetricDefinition, page: LayoutPage | undefined, catalog: Catalog): true | string {
  if (widget.display === 'breakdown') return REFUSALS.breakdownOne;
  if (widget.metrics.includes(metric.key)) return REFUSALS.alreadyIn;
  if (widget.metrics.length >= METRICS_PER_WIDGET_MAX) return REFUSALS.widgetFull;
  if (!metric.displays.includes(widget.display)) return REFUSALS.unsupported;
  if (widget.display === 'trend') {
    const units = trendUnits(widget, catalog);
    if (!units.has(metric.unit) && units.size >= TREND_UNITS_MAX) return REFUSALS.twoUnits;
  }
  if (countMetrics(page) >= METRICS_PER_PAGE_MAX) return REFUSALS.metricsFull;
  return true;
}

/** Whether a new one-metric widget may be created on this page. */
export function canCreateWidget(page: LayoutPage | undefined): true | string {
  if (countWidgets(page) >= WIDGETS_PER_PAGE_MAX) return REFUSALS.widgetsFull;
  if (countMetrics(page) >= METRICS_PER_PAGE_MAX) return REFUSALS.metricsFull;
  return true;
}

export const canAddRow = (page: LayoutPage | undefined): true | string => ((page?.rows.length ?? 0) >= ROWS_MAX ? REFUSALS.rowsFull : true);

/** Displays every metric of the widget supports, in the order of the first metric's list. */
export function sharedDisplays(metrics: string[], catalog: Catalog): WidgetDisplay[] {
  const definitions = metrics.map((key) => catalog.get(key)).filter((metric): metric is MetricDefinition => Boolean(metric));
  if (definitions.length === 0) return ['number', 'trend', 'breakdown'];
  return definitions[0].displays.filter((display) => definitions.every((metric) => metric.displays.includes(display)));
}

/** Keeps a widget valid for every one of its metrics after a metric or display change. */
export function fitToMetrics(widget: Widget, catalog: Catalog): Widget {
  const displays = sharedDisplays(widget.metrics, catalog);
  const display = displays.includes(widget.display) ? widget.display : displays[0] ?? widget.display;
  const metrics = display === 'breakdown' ? widget.metrics.slice(0, 1) : widget.metrics;
  const offered = catalog.get(metrics[0])?.breakdowns ?? [];
  const breakdown = display !== 'breakdown' ? null : offered.some((item) => item.key === widget.breakdown) ? widget.breakdown : offered[0]?.key ?? widget.breakdown;
  const interval = display === 'trend' ? widget.interval ?? 'day' : null;
  const compare = display === 'number' ? widget.compare : false;
  const next = { ...widget, display, metrics, breakdown, interval, compare };
  return deepEqual(next, widget) ? widget : next;
}

export function newWidget(metric: MetricDefinition): Widget {
  const display = metric.displays[0] ?? 'number';
  return {
    id: newId(), metrics: [metric.key], display, title: null, period: 'selected',
    interval: display === 'trend' ? 'day' : null,
    breakdown: display === 'breakdown' ? metric.breakdowns[0]?.key ?? null : null,
    compare: display === 'number' && !metric.current, limit: LIMIT_DEFAULT,
  };
}

export const newRow = (widths: number[], firstBlockWidgets: Widget[] = []): LayoutRow => ({
  id: newId(), columns: widths.map((width, i) => ({ width, widgets: i === 0 ? firstBlockWidgets : [] })),
});

export const newPage = (title = 'New page'): LayoutPage => ({ id: newId(), title, rows: [newRow([12])] });

const copyWidget = (widget: Widget): Widget => ({ ...widget, id: newId(), metrics: [...widget.metrics] });
const copyRow = (row: LayoutRow): LayoutRow => ({ id: newId(), columns: row.columns.map((block) => ({ width: block.width, widgets: block.widgets.map(copyWidget) })) });

// ---- Widgets ----

export function insertWidget(pages: LayoutPage[], widget: Widget, to: WidgetLocation): LayoutPage[] {
  return mapBlock(pages, to.pageId, to.rowId, to.blockIndex, (widgets) => insertAt(widgets, clamp(to.index, 0, widgets.length), widget));
}

/** `to.index` means "before the item currently at that index", counted with the moved widget still in place. */
export function moveWidget(pages: LayoutPage[], widgetId: string, to: WidgetLocation): LayoutPage[] {
  const from = locateWidget(pages, widgetId);
  if (!from) return pages;
  const sameList = from.pageId === to.pageId && from.rowId === to.rowId && from.blockIndex === to.blockIndex;
  if (sameList) {
    const target = to.index > from.index ? to.index - 1 : to.index;
    return mapBlock(pages, from.pageId, from.rowId, from.blockIndex, (widgets) => moveItem(widgets, from.index, clamp(target, 0, widgets.length - 1)));
  }
  const widget = findWidget(pages, widgetId);
  if (!widget) return pages;
  const removed = mapBlock(pages, from.pageId, from.rowId, from.blockIndex, (widgets) => widgets.filter((item) => item.id !== widgetId));
  const inserted = insertWidget(removed, widget, to);
  return inserted === removed ? pages : inserted;
}

export function updateWidget(pages: LayoutPage[], widgetId: string, patch: Partial<Widget>): LayoutPage[] {
  const at = locateWidget(pages, widgetId);
  if (!at) return pages;
  return mapBlock(pages, at.pageId, at.rowId, at.blockIndex, (widgets) => {
    const current = widgets[at.index];
    const next = { ...current, ...patch };
    return deepEqual(next, current) ? widgets : replaceAt(widgets, at.index, next);
  });
}

export function replaceWidget(pages: LayoutPage[], widget: Widget): LayoutPage[] {
  const at = locateWidget(pages, widget.id);
  if (!at) return pages;
  return mapBlock(pages, at.pageId, at.rowId, at.blockIndex, (widgets) => (deepEqual(widgets[at.index], widget) ? widgets : replaceAt(widgets, at.index, widget)));
}

export function addMetricToWidget(pages: LayoutPage[], widgetId: string, metricKey: string, catalog: Catalog): LayoutPage[] {
  const widget = findWidget(pages, widgetId);
  if (!widget || widget.metrics.includes(metricKey)) return pages;
  return replaceWidget(pages, fitToMetrics({ ...widget, metrics: [...widget.metrics, metricKey] }, catalog));
}

export function removeWidget(pages: LayoutPage[], widgetId: string): LayoutPage[] {
  const at = locateWidget(pages, widgetId);
  if (!at) return pages;
  return mapBlock(pages, at.pageId, at.rowId, at.blockIndex, (widgets) => widgets.filter((widget) => widget.id !== widgetId));
}

// ---- Rows ----

export function insertRow(pages: LayoutPage[], pageId: string, row: LayoutRow, toIndex: number): LayoutPage[] {
  return mapPage(pages, pageId, (page) => mapRows(page, (rows) => insertAt(rows, clamp(toIndex, 0, rows.length), row)));
}

/** `toIndex` is the row's final position, as a sortable list reports it. */
export function moveRow(pages: LayoutPage[], pageId: string, rowId: string, toIndex: number): LayoutPage[] {
  return mapPage(pages, pageId, (page) => mapRows(page, (rows) => {
    const from = rows.findIndex((row) => row.id === rowId);
    return from < 0 ? rows : moveItem(rows, from, clamp(toIndex, 0, rows.length - 1));
  }));
}

export function removeRow(pages: LayoutPage[], pageId: string, rowId: string): LayoutPage[] {
  return mapPage(pages, pageId, (page) => mapRows(page, (rows) => (rows.some((row) => row.id === rowId) ? rows.filter((row) => row.id !== rowId) : rows)));
}

export function duplicateRow(pages: LayoutPage[], pageId: string, rowId: string): LayoutPage[] {
  return mapPage(pages, pageId, (page) => mapRows(page, (rows) => {
    const index = rows.findIndex((row) => row.id === rowId);
    return index < 0 ? rows : insertAt(rows, index + 1, copyRow(rows[index]));
  }));
}

/**
 * Gives a row new block widths. Widgets of removed blocks move, in order, to the end of the
 * last remaining block; new blocks are added empty on the right. No widget is ever dropped.
 */
export function resplitRow(pages: LayoutPage[], pageId: string, rowId: string, widths: number[]): { pages: LayoutPage[]; moved: number } {
  const clean = widths.slice(0, ROW_BLOCKS_MAX).map((width) => clamp(Math.round(width), BLOCK_WIDTH_MIN, BLOCK_WIDTH_MAX));
  if (clean.length === 0) return { pages, moved: 0 };
  let moved = 0;
  const next = mapPage(pages, pageId, (page) => mapRows(page, (rows) => {
    const index = rows.findIndex((row) => row.id === rowId);
    if (index < 0) return rows;
    const row = rows[index];
    if (deepEqual(rowWidths(row), clean)) return rows;
    const columns: LayoutBlock[] = clean.map((width, i) => {
      const existing = row.columns[i];
      return existing ? (existing.width === width ? existing : { ...existing, width }) : { width, widgets: [] };
    });
    const orphans = row.columns.slice(clean.length).flatMap((block) => block.widgets);
    moved = orphans.length;
    if (orphans.length) { const last = columns.length - 1; columns[last] = { ...columns[last], widgets: [...columns[last].widgets, ...orphans] }; }
    return replaceAt(rows, index, { ...row, columns });
  }));
  return { pages: next, moved };
}

// ---- Pages ----

export const addPage = (pages: LayoutPage[], page: LayoutPage): LayoutPage[] => [...pages, page];

export function renamePage(pages: LayoutPage[], pageId: string, title: string): LayoutPage[] {
  return mapPage(pages, pageId, (page) => (page.title === title ? page : { ...page, title }));
}

export function movePage(pages: LayoutPage[], pageId: string, toIndex: number): LayoutPage[] {
  const from = pages.findIndex((page) => page.id === pageId);
  return from < 0 ? pages : moveItem(pages, from, clamp(toIndex, 0, pages.length - 1));
}

export function duplicatePage(pages: LayoutPage[], pageId: string): { pages: LayoutPage[]; pageId: string | null } {
  const index = pages.findIndex((page) => page.id === pageId);
  if (index < 0) return { pages, pageId: null };
  const source = pages[index];
  const copy: LayoutPage = { id: newId(), title: `${source.title} (copy)`.slice(0, PAGE_TITLE_MAX), rows: source.rows.map(copyRow) };
  return { pages: insertAt(pages, index + 1, copy), pageId: copy.id };
}

export function removePage(pages: LayoutPage[], pageId: string): LayoutPage[] {
  if (pages.length <= 1 || !pages.some((page) => page.id === pageId)) return pages;
  return pages.filter((page) => page.id !== pageId);
}

// ---- Client-side rule check ----

export const ROW_TOO_WIDE = 'The blocks are wider than the row: their widths add up to more than 12.';
export const EMPTY_PAGE = 'Add at least one widget, or remove the page.';

/** The rules of the server, checked locally. Keys use the server's error paths. */
export function problems(pages: LayoutPage[]): Map<string, string> {
  const found = new Map<string, string>();
  if (pages.length < 1 || pages.length > PAGES_MAX) found.set('pages', `From 1 to ${PAGES_MAX} pages, or reset to the default layout.`);
  pages.forEach((page, p) => {
    const at = `pages.${p}`;
    const title = page.title.trim();
    if (title.length < 1 || title.length > PAGE_TITLE_MAX) found.set(`${at}.title`, `From 1 to ${PAGE_TITLE_MAX} characters.`);
    const widgets = countWidgets(page);
    if (page.rows.length > ROWS_MAX) found.set(`${at}.rows`, `At most ${ROWS_MAX} rows.`);
    else if (widgets === 0) found.set(`${at}.rows`, EMPTY_PAGE);
    else if (widgets > WIDGETS_PER_PAGE_MAX) found.set(`${at}.rows`, `At most ${WIDGETS_PER_PAGE_MAX} widgets on a page.`);
    else if (countMetrics(page) > METRICS_PER_PAGE_MAX) found.set(`${at}.rows`, `At most ${METRICS_PER_PAGE_MAX} metrics on a page, counting every widget's.`);
    page.rows.forEach((row, r) => {
      if (row.columns.length < 1 || row.columns.length > ROW_BLOCKS_MAX) found.set(`${at}.rows.${r}.columns`, `From 1 to ${ROW_BLOCKS_MAX} blocks.`);
      else if (rowWidth(row) > ROW_WIDTH) found.set(`${at}.rows.${r}.columns`, ROW_TOO_WIDE);
    });
  });
  return found;
}
