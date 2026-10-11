/**
 * The drag-and-drop vocabulary of the builder: every draggable and droppable id is built and
 * parsed only here. Layout ids never contain ":", but metric keys contain ".".
 */
import type { UniqueIdentifier } from '@dnd-kit/core';

export type DragData =
  | { type: 'tab'; pageId: string }
  | { type: 'root' }
  | { type: 'row'; rowId: string }
  | { type: 'block'; rowId: string; blockIndex: number }
  | { type: 'widget'; widgetId: string }
  | { type: 'palette'; kind: 'metric'; metricKey: string }
  | { type: 'palette'; kind: 'row'; widths: number[] };

export const TABS_ID = 'tabs';
export const ROOT_ID = 'root';

export const tabId = (pageId: string) => `tab:${pageId}`;
export const rowDndId = (rowId: string) => `row:${rowId}`;
export const blockId = (rowId: string, blockIndex: number) => `block:${rowId}:${blockIndex}`;
export const widgetDndId = (widgetId: string) => `widget:${widgetId}`;
export const paletteMetricId = (metricKey: string) => `palette:metric:${metricKey}`;
export const paletteRowId = (widths: number[]) => `palette:row:${widths.join('-')}`;

export function parseId(id: UniqueIdentifier): DragData | null {
  const value = String(id);
  if (value === ROOT_ID) return { type: 'root' };
  if (value.startsWith('tab:')) return { type: 'tab', pageId: value.slice(4) };
  if (value.startsWith('row:')) return { type: 'row', rowId: value.slice(4) };
  if (value.startsWith('widget:')) return { type: 'widget', widgetId: value.slice(7) };
  if (value.startsWith('palette:metric:')) return { type: 'palette', kind: 'metric', metricKey: value.slice(15) };
  if (value.startsWith('palette:row:')) return { type: 'palette', kind: 'row', widths: value.slice(12).split('-').map(Number) };
  if (value.startsWith('block:')) {
    const last = value.lastIndexOf(':');
    return { type: 'block', rowId: value.slice(6, last), blockIndex: Number(value.slice(last + 1)) };
  }
  return null;
}

/** The data of a draggable or droppable, from its `data.current` or, failing that, its id. */
export const dataOf = (item: { id: UniqueIdentifier; data: { current?: unknown } } | null | undefined): DragData | null =>
  item ? ((item.data.current as DragData | undefined) ?? parseId(item.id)) : null;
