import {
  closestCenter, KeyboardSensor, PointerSensor, pointerWithin, rectIntersection, useSensor, useSensors,
  type Active, type Announcements, type CollisionDetection, type DragEndEvent, type DragMoveEvent, type DragOverEvent, type DragStartEvent, type Over, type UniqueIdentifier,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { widgetTitle } from '../../lib/format';
import {
  addMetricToWidget, canAddMetric, canAddRow, canCreateWidget, findPage, findWidget, insertRow, insertWidget, locateWidget,
  movePage, moveRow, moveWidget, newRow, newWidget, REFUSALS, type WidgetLocation,
} from '../../lib/layout';
import { FULL_ROW, splitLabel } from '../../lib/presets';
import type { LayoutPage } from '../../types/analyticWidgets';
import { useBuilder } from './WidgetBuilderProvider';
import { blockId, dataOf, parseId, type DragData } from './dnd';

/** Where the dragged item would land, shown while it hovers and applied on drop. */
export type DropIntent =
  | { kind: 'add-to-widget'; widgetId: string; label: string }
  | { kind: 'insert-widget'; blockId: string; index: number }
  | { kind: 'insert-row'; index: number }
  | { kind: 'move-row' | 'move-tab'; overId: string }
  | { kind: 'refuse'; zoneId: string; message: string };

export interface Refusal { zoneId: string; message: string; at: number }

const REFUSAL_MS = 2000;
// Module constants: new option objects on every render would recreate the sensors.
const POINTER_OPTIONS = { activationConstraint: { distance: 6 } };
const KEYBOARD_OPTIONS = { coordinateGetter: sortableKeyboardCoordinates };

const PRIORITY: Record<DragData['type'], number> = { widget: 0, block: 1, row: 2, tab: 2, root: 3, palette: 9 };

/** Which droppables a drag may target. Palette rows still see blocks, so they can be refused there with a reason. */
function accepts(active: DragData | null, target: DragData | null): boolean {
  if (!active || !target) return false;
  switch (active.type) {
    case 'tab': return target.type === 'tab';
    case 'row': return target.type === 'row' || target.type === 'root';
    case 'widget': return target.type === 'widget' || target.type === 'block';
    case 'palette': return active.kind === 'metric'
      ? target.type === 'widget' || target.type === 'block' || target.type === 'root'
      : target.type === 'row' || target.type === 'root' || target.type === 'block' || target.type === 'widget';
    default: return false;
  }
}

const byPriority = <T extends { id: UniqueIdentifier; data?: { droppableContainer?: { data: { current?: unknown } } } }>(collisions: T[]) =>
  [...collisions].sort((a, b) => (PRIORITY[parseId(a.id)?.type ?? 'palette'] ?? 9) - (PRIORITY[parseId(b.id)?.type ?? 'palette'] ?? 9));

/** pointerWithin, then rectIntersection; closestCenter only without a pointer (keyboard). The innermost target wins. */
const collisionDetection: CollisionDetection = (args) => {
  const active = dataOf(args.active);
  const scoped = { ...args, droppableContainers: args.droppableContainers.filter((container) => container.id !== args.active.id && accepts(active, dataOf(container))) };
  if (args.pointerCoordinates) {
    const within = pointerWithin(scoped);
    if (within.length) return byPriority(within);
    return byPriority(rectIntersection(scoped));
  }
  return closestCenter(scoped);
};

/** The rows of the canvas, top to bottom, for "between rows" positions. */
function rowRects(canvas: HTMLElement | null): DOMRect[] {
  return canvas ? [...canvas.querySelectorAll<HTMLElement>('[data-builder-row]')].map((element) => element.getBoundingClientRect()) : [];
}

export function useBuilderDnd(canvasRef: React.RefObject<HTMLElement | null>) {
  const builder = useBuilder();
  const { state, catalog, activePage, edit, preview, select } = builder;
  const latest = useRef(builder);
  useEffect(() => { latest.current = builder; });

  const sensors = useSensors(useSensor(PointerSensor, POINTER_OPTIONS), useSensor(KeyboardSensor, KEYBOARD_OPTIONS));
  const [active, setActive] = useState<DragData | null>(null);
  const [intent, setIntent] = useState<DropIntent | null>(null);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const snapshot = useRef<LayoutPage[] | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const lastAnnouncement = useRef<string | null>(null);

  useEffect(() => {
    if (!refusal) return;
    const timer = window.setTimeout(() => setRefusal(null), REFUSAL_MS);
    return () => window.clearTimeout(timer);
  }, [refusal]);

  // The pointer position during a drag, for "middle half of a card" and "between rows" decisions.
  useEffect(() => {
    if (!active) return;
    const track = (event: PointerEvent) => { pointer.current = { x: event.clientX, y: event.clientY }; };
    window.addEventListener('pointermove', track, { passive: true });
    return () => window.removeEventListener('pointermove', track);
  }, [active]);


  /** Where a drop of `activeItem` on `over` would land, with the current pages. */
  const resolve = useCallback((activeItem: Active, over: Over | null): DropIntent | null => {
    const { state: current, activePage: page, catalog: metrics } = latest.current;
    const dragged = dataOf(activeItem); const target = dataOf(over);
    if (!dragged || !over || !target) return null;
    const y = pointerY(pointer.current, activeItem);
    const rowIndexAt = () => rowRects(canvasRef.current).filter((rect) => rect.top + rect.height / 2 < y).length;

    if (dragged.type === 'tab') return target.type === 'tab' ? { kind: 'move-tab', overId: String(over.id) } : null;
    if (dragged.type === 'row') return target.type === 'row' ? { kind: 'move-row', overId: String(over.id) } : null;

    if (dragged.type === 'widget') {
      if (target.type === 'widget') {
        const at = locateWidget([page], target.widgetId);
        return at ? { kind: 'insert-widget', blockId: blockId(at.rowId, at.blockIndex), index: at.index } : null;
      }
      return target.type === 'block' ? { kind: 'insert-widget', blockId: String(over.id), index: -1 } : null;
    }

    if (dragged.type !== 'palette') return null;
    if (dragged.kind === 'row') {
      if (target.type === 'block' || target.type === 'widget') return { kind: 'refuse', zoneId: target.type === 'block' ? String(over.id) : zoneOfWidget(page, target.widgetId), message: REFUSALS.rowInBlock };
      const allowed = canAddRow(page);
      if (allowed !== true) return { kind: 'refuse', zoneId: 'root', message: allowed };
      if (target.type === 'row') {
        const index = page.rows.findIndex((row) => row.id === target.rowId);
        return { kind: 'insert-row', index: index + (y > over.rect.top + over.rect.height / 2 ? 1 : 0) };
      }
      return { kind: 'insert-row', index: rowIndexAt() };
    }

    // A palette metric.
    const metric = metrics.get(dragged.metricKey);
    if (!metric) return null;
    if (target.type === 'widget') {
      const widget = findWidget(current.pages, target.widgetId);
      const at = locateWidget([page], target.widgetId);
      if (!widget || !at) return null;
      const offset = (y - over.rect.top) / Math.max(over.rect.height, 1);
      if (offset > 0.25 && offset < 0.75) {
        const allowed = canAddMetric(widget, metric, page, metrics);
        return allowed === true ? { kind: 'add-to-widget', widgetId: widget.id, label: widgetTitle(widget, metrics) } : { kind: 'refuse', zoneId: String(over.id), message: allowed };
      }
      const allowed = canCreateWidget(page);
      if (allowed !== true) return { kind: 'refuse', zoneId: blockId(at.rowId, at.blockIndex), message: allowed };
      return { kind: 'insert-widget', blockId: blockId(at.rowId, at.blockIndex), index: at.index + (offset >= 0.75 ? 1 : 0) };
    }
    const allowed = canCreateWidget(page);
    if (target.type === 'block') return allowed === true ? { kind: 'insert-widget', blockId: String(over.id), index: -1 } : { kind: 'refuse', zoneId: String(over.id), message: allowed };
    if (target.type === 'root') {
      const rows = canAddRow(page);
      if (allowed !== true || rows !== true) return { kind: 'refuse', zoneId: 'root', message: allowed !== true ? allowed : rows as string };
      return { kind: 'insert-row', index: rowIndexAt() };
    }
    return null;
  }, [canvasRef]);

  const onDragStart = useCallback(({ active: item }: DragStartEvent) => {
    snapshot.current = latest.current.state.pages;
    pointer.current = null;
    setActive(dataOf(item));
    setIntent(null);
  }, []);

  const onDragMove = useCallback(({ active: item, over }: DragMoveEvent) => {
    // Only palette drags depend on where inside a card the pointer is; sortables update in onDragOver.
    if (dataOf(item)?.type !== 'palette') return;
    const next = resolve(item, over);
    setIntent((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
  }, [resolve]);

  const onDragOver = useCallback(({ active: item, over }: DragOverEvent) => {
    const dragged = dataOf(item);
    const next = resolve(item, over);
    setIntent(next);
    // An existing widget over a different block hops there now, so the move is visible during the drag.
    if (dragged?.type !== 'widget' || next?.kind !== 'insert-widget') return;
    const { state: current, activePage: page } = latest.current;
    const from = locateWidget(current.pages, dragged.widgetId);
    const to = parseId(next.blockId);
    if (!from || to?.type !== 'block' || (from.rowId === to.rowId && from.blockIndex === to.blockIndex)) return;
    const block = page.rows.find((row) => row.id === to.rowId)?.columns[to.blockIndex];
    if (!block) return;
    let index = next.index < 0 ? block.widgets.length : next.index;
    const translated = item.rect.current.translated;
    if (next.index >= 0 && over && translated && translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2) index += 1;
    preview(moveWidget(current.pages, dragged.widgetId, { pageId: page.id, rowId: to.rowId, blockIndex: to.blockIndex, index }));
  }, [resolve, preview]);

  const restore = useCallback(() => {
    if (snapshot.current) preview(snapshot.current);
    snapshot.current = null;
  }, [preview]);

  const finish = useCallback(() => { setActive(null); setIntent(null); pointer.current = null; }, []);

  const refuse = useCallback((zoneId: string, message: string) => setRefusal({ zoneId, message, at: Date.now() }), []);

  const onDragEnd = useCallback(({ active: item, over }: DragEndEvent) => {
    const dragged = dataOf(item);
    const next = resolve(item, over);
    const { state: current, activePage: page, catalog: metrics } = latest.current;
    const before = snapshot.current ?? current.pages;
    finish();
    lastAnnouncement.current = null;

    if (!dragged || !next) { restore(); return; }
    if (next.kind === 'refuse') { restore(); refuse(next.zoneId, next.message); return; }

    if (dragged.type === 'tab' && next.kind === 'move-tab') {
      const to = parseId(next.overId);
      if (to?.type === 'tab') edit((pages) => movePage(pages, dragged.pageId, pages.findIndex((p) => p.id === to.pageId)), 'all');
    } else if (dragged.type === 'row' && next.kind === 'move-row') {
      const to = parseId(next.overId);
      if (to?.type === 'row') edit((pages) => moveRow(pages, page.id, dragged.rowId, page.rows.findIndex((row) => row.id === to.rowId)), 'all');
    } else if (dragged.type === 'widget' && next.kind === 'insert-widget') {
      const from = locateWidget(current.pages, dragged.widgetId);
      const to = parseId(next.blockId);
      let pages = current.pages;
      if (from && to?.type === 'block' && next.index >= 0 && from.rowId === to.rowId && from.blockIndex === to.blockIndex) {
        // Within one list the sortable preview shows the item taking the hovered item's place.
        const index = next.index > from.index ? next.index + 1 : next.index;
        pages = moveWidget(pages, dragged.widgetId, { ...from, index });
      }
      // Commit against the snapshot so an unchanged result reads as clean and keeps errors.
      if (pages === before) preview(before);
      else { edit(() => pages, 'all'); latest.current.setServerErrors({}); }
    } else if (dragged.type === 'palette' && dragged.kind === 'metric') {
      const metric = metrics.get(dragged.metricKey);
      if (!metric) { restore(); return; }
      if (next.kind === 'add-to-widget') {
        edit((pages) => addMetricToWidget(pages, next.widgetId, metric.key, metrics), 'all', { select: { kind: 'widget', widgetId: next.widgetId } });
        lastAnnouncement.current = `${metric.label} was added to ${next.label}.`;
      } else if (next.kind === 'insert-widget') {
        const to = parseId(next.blockId);
        if (to?.type !== 'block') return;
        const widget = newWidget(metric);
        const block = page.rows.find((row) => row.id === to.rowId)?.columns[to.blockIndex];
        const location: WidgetLocation = { pageId: page.id, rowId: to.rowId, blockIndex: to.blockIndex, index: next.index < 0 ? block?.widgets.length ?? 0 : next.index };
        edit((pages) => insertWidget(pages, widget, location), 'all', { select: { kind: 'widget', widgetId: widget.id } });
      } else if (next.kind === 'insert-row') {
        const widget = newWidget(metric);
        edit((pages) => insertRow(pages, page.id, newRow(FULL_ROW, [widget]), next.index), 'all', { select: { kind: 'widget', widgetId: widget.id } });
      }
    } else if (dragged.type === 'palette' && dragged.kind === 'row' && next.kind === 'insert-row') {
      const row = newRow(dragged.widths);
      edit((pages) => insertRow(pages, page.id, row, next.index), 'all', { select: { kind: 'row', rowId: row.id } });
    } else {
      restore();
      return;
    }
    snapshot.current = null;
  }, [resolve, restore, edit, preview, finish, refuse]);

  const onDragCancel = useCallback(() => { finish(); restore(); }, [finish, restore]);

  // ---- Screen-reader announcements ----
  const describe = useCallback((id: UniqueIdentifier): string => {
    const { state: current, activePage: page, catalog: metrics } = latest.current;
    const data = parseId(id);
    const rowNumber = (rowId: string) => page.rows.findIndex((row) => row.id === rowId) + 1;
    switch (data?.type) {
      case 'tab': return findPage(current.pages, data.pageId)?.title ?? 'page';
      case 'root': return 'the rows list';
      case 'row': return `Row ${rowNumber(data.rowId)}`;
      case 'block': return `Row ${rowNumber(data.rowId)}, block ${data.blockIndex + 1}`;
      case 'widget': { const widget = findWidget(current.pages, data.widgetId); return widget ? widgetTitle(widget, metrics) : 'widget'; }
      case 'palette': return data.kind === 'metric' ? metrics.get(data.metricKey)?.label ?? data.metricKey : `${splitLabel(data.widths)} row`;
      default: return String(id);
    }
  }, []);

  const announcements = useMemo<Announcements>(() => ({
    onDragStart: ({ active: item }) => `Picked up ${describe(item.id)}.`,
    onDragOver: ({ active: item, over }) => (over ? `${describe(item.id)} is over ${describe(over.id)}.` : `${describe(item.id)} is no longer over a drop area.`),
    onDragEnd: ({ active: item, over }) => lastAnnouncement.current ?? (over ? `${describe(item.id)} was dropped on ${describe(over.id)}.` : `${describe(item.id)} was put back.`),
    onDragCancel: ({ active: item }) => `Dragging was cancelled. ${describe(item.id)} was put back.`,
  }), [describe]);

  return {
    sensors, collisionDetection, active, intent, refusal, announcements,
    handlers: { onDragStart, onDragMove, onDragOver, onDragEnd, onDragCancel },
    // Exposed so drop zones can flash a refusal for click-to-add too.
    refuse, state, catalog, activePage, select,
  };
}

/** The pointer's height, or the dragged item's centre for keyboard drags. */
function pointerY(pointer: { y: number } | null, activeItem: Active): number {
  if (pointer) return pointer.y;
  const rect = activeItem.rect.current.translated;
  return rect ? rect.top + rect.height / 2 : 0;
}

function zoneOfWidget(page: LayoutPage, widgetId: string): string {
  const at = locateWidget([page], widgetId);
  return at ? blockId(at.rowId, at.blockIndex) : 'root';
}
