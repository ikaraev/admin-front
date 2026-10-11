import type { LayoutPage } from '../types/analyticWidgets';

export type ServerErrors = Record<string, string[]>;

/** Server 422 messages, attached to the things they are about. Paths are positional: `pages.{p}.rows.{r}.columns.{c}.widgets.{w}.{field}`. */
export interface MappedErrors {
  /** widget id → field (`metrics`, `metrics.2`, `display`, `breakdown`, `title`, `limit`, `id`, …) → messages */
  widgets: Map<string, Map<string, string[]>>;
  /** row id → messages about its blocks and widths */
  rows: Map<string, string[]>;
  /** page id → messages about its title and rows */
  pages: Map<string, string[]>;
  /** messages about the whole layout (`pages`) */
  layout: string[];
  /** paths that point at nothing in the current pages */
  unmapped: { path: string; messages: string[] }[];
}

const WIDGET_PATH = /^pages\.(\d+)\.rows\.(\d+)\.columns\.(\d+)\.widgets\.(\d+)(?:\.(.+))?$/;
const ROW_PATH = /^pages\.(\d+)\.rows\.(\d+)(?:\.(?:columns|id)(?:\.\d+(?:\.width)?)?)?$/;
const PAGE_PATH = /^pages\.(\d+)(?:\.(title|rows|id))?$/;

const push = <K,>(map: Map<K, string[]>, key: K, messages: string[]) => map.set(key, [...(map.get(key) ?? []), ...messages]);

export function mapServerErrors(pages: LayoutPage[], errors: ServerErrors): MappedErrors {
  const mapped: MappedErrors = { widgets: new Map(), rows: new Map(), pages: new Map(), layout: [], unmapped: [] };
  for (const [path, messages] of Object.entries(errors)) {
    const widget = WIDGET_PATH.exec(path);
    if (widget) {
      const [, p, r, c, w, field = ''] = widget;
      const target = pages[+p]?.rows[+r]?.columns[+c]?.widgets[+w];
      if (target) {
        const fields = mapped.widgets.get(target.id) ?? new Map<string, string[]>();
        push(fields, field, messages);
        mapped.widgets.set(target.id, fields);
        continue;
      }
    }
    const row = ROW_PATH.exec(path);
    if (row) {
      const target = pages[+row[1]]?.rows[+row[2]];
      if (target) { push(mapped.rows, target.id, messages); continue; }
    }
    const page = PAGE_PATH.exec(path);
    if (page) {
      const target = pages[+page[1]];
      if (target) { push(mapped.pages, target.id, messages); continue; }
    }
    if (path === 'pages' || path === 'version') { mapped.layout.push(...messages); continue; }
    mapped.unmapped.push({ path, messages });
  }
  return mapped;
}

/** The first page any mapped error points at, so the builder can switch to it. */
export function firstPageWithErrors(pages: LayoutPage[], errors: ServerErrors): string | null {
  const indexes = Object.keys(errors).map((path) => /^pages\.(\d+)/.exec(path)?.[1]).filter((index): index is string => index !== undefined).map(Number);
  if (indexes.length === 0) return null;
  return pages[Math.min(...indexes)]?.id ?? null;
}
