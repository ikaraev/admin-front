import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useMemo, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils';
import { refusalFor, useDndUi } from './dndState';
import { ROOT_ID, rowDndId } from './dnd';
import { RowCard, type CanvasFigures } from './RowCard';
import { useBuilder } from './WidgetBuilderProvider';

function InsertLine() {
  return <div aria-hidden className="h-1 rounded-full bg-primary" />;
}

/** The rows of the active page: a sortable list that is also the drop target for new rows. */
export function BuilderCanvas({ figures, canvasRef }: { figures: CanvasFigures; canvasRef: RefObject<HTMLDivElement | null> }) {
  const { activePage, locked, select } = useBuilder();
  const { setNodeRef } = useDroppable({ id: ROOT_ID, data: { type: 'root' }, disabled: locked });
  const ui = useDndUi();
  const items = useMemo(() => activePage.rows.map((row) => rowDndId(row.id)), [activePage.rows]);
  const insertAt = ui.intent?.kind === 'insert-row' ? ui.intent.index : null;
  const refusal = refusalFor(ui, ROOT_ID);

  const children: ReactNode[] = [];
  activePage.rows.forEach((row, index) => {
    if (insertAt === index) children.push(<InsertLine key="insert" />);
    children.push(<RowCard key={row.id} row={row} index={index} figures={figures} />);
  });
  if (insertAt !== null && insertAt >= activePage.rows.length) children.push(<InsertLine key="insert" />);

  return <div ref={(node) => { setNodeRef(node); canvasRef.current = node; }}
    onClick={(event) => { if (event.target === event.currentTarget) select(null); }}
    className={cn('flex min-h-64 flex-col gap-3 rounded-xl p-1 pb-16 transition-colors duration-150', refusal && 'bg-destructive/5')}>
    <SortableContext id={ROOT_ID} items={items} strategy={verticalListSortingStrategy}>{children}</SortableContext>
    {activePage.rows.length === 0 ? <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Drag a row or a metric here.</p> : null}
    {refusal ? <p className="text-center text-sm font-medium text-destructive">{refusal}</p> : null}
  </div>;
}
