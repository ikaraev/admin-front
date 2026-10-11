import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { LayoutBlock } from '../../types/analyticWidgets';
import { refusalFor, useDndUi } from './dndState';
import { blockId, widgetDndId } from './dnd';
import { BuilderWidgetCard } from './BuilderWidgetCard';
import type { CanvasFigures } from './RowCard';
import { useBuilder } from './WidgetBuilderProvider';
import { useBuilderActions } from './useBuilderActions';

/** One block of a row: a droppable with its own sortable list of widget cards. */
export function BlockDropZone({ rowId, blockIndex, block, figures }: { rowId: string; blockIndex: number; block: LayoutBlock; figures: CanvasFigures }) {
  const id = blockId(rowId, blockIndex);
  const { state, catalog, errors, locked, select } = useBuilder();
  const actions = useBuilderActions();
  const { setNodeRef } = useDroppable({ id, data: { type: 'block', rowId, blockIndex }, disabled: locked });
  const ui = useDndUi();
  const items = useMemo(() => block.widgets.map((widget) => widgetDndId(widget.id)), [block.widgets]);
  const refusal = refusalFor(ui, id);
  const highlighted = ui.intent?.kind === 'insert-widget' && ui.intent.blockId === id;
  const selected = state.selection?.kind === 'block' && state.selection.rowId === rowId && state.selection.blockIndex === blockIndex;

  return <div ref={setNodeRef} onClick={(event) => { if (event.target === event.currentTarget) select({ kind: 'block', rowId, blockIndex }); }}
    className={cn('flex min-h-24 min-w-0 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors duration-150',
      highlighted ? 'border-primary bg-primary/5' : refusal ? 'border-destructive bg-destructive/5' : selected ? 'border-primary/60' : 'border-border')}>
    <button type="button" onClick={() => select({ kind: 'block', rowId, blockIndex })} className="self-start rounded px-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
      Block {blockIndex + 1} · {block.width}/12
    </button>
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      {block.widgets.map((widget) => {
        const answers = figures.data?.results[widget.id]?.metrics;
        return <BuilderWidgetCard key={widget.id} widget={widget} catalog={catalog} answers={answers} failed={figures.failed && !answers} currency={figures.data?.currency ?? null}
          width={block.width} selected={state.selection?.kind === 'widget' && state.selection.widgetId === widget.id}
          errorCount={[...(errors.widgets.get(widget.id)?.values() ?? [])].reduce((sum, messages) => sum + messages.length, 0)}
          disabled={locked} onSelect={figures.selectWidget} onRemove={actions.removeWidget} onRetry={figures.onRetry} />;
      })}
    </SortableContext>
    {block.widgets.length === 0 || refusal ? <p className={cn('flex flex-1 items-center justify-center px-2 py-4 text-center text-xs', refusal ? 'font-medium text-destructive' : 'text-muted-foreground')}>
      {refusal ?? 'Drop a metric here'}
    </p> : null}
  </div>;
}
