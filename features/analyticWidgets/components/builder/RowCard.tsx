import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDownIcon, CopyIcon, GripVerticalIcon, Trash2Icon } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmButton';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ROW_WIDTH } from '../../lib/limits';
import { rowWidgetCount, rowWidth, rowWidths } from '../../lib/layout';
import { SPLIT_PRESETS, splitLabel } from '../../lib/presets';
import type { LayoutRow, WidgetData } from '../../types/analyticWidgets';
import { BlockDropZone } from './BlockDropZone';
import { rowDndId } from './dnd';
import { SplitIcon } from './SplitIcon';
import { useBuilderActions } from './useBuilderActions';
import { useBuilder } from './WidgetBuilderProvider';

export interface CanvasFigures { data: WidgetData | undefined; failed: boolean; onRetry: () => void; selectWidget: (widgetId: string) => void }

/** A row in the builder: a header (grip, split, duplicate, delete) over its blocks, laid out in proportion. */
export function RowCard({ row, index, figures }: { row: LayoutRow; index: number; figures: CanvasFigures }) {
  const { state, errors, problems, locked, select, activePage } = useBuilder();
  const actions = useBuilderActions();
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, transition, isDragging } = useSortable({ id: rowDndId(row.id), data: { type: 'row', rowId: row.id }, disabled: locked });
  const [confirming, setConfirming] = useState(false);
  const widths = rowWidths(row);
  const total = rowWidth(row);
  const selected = state.selection?.kind === 'row' && state.selection.rowId === row.id;
  const p = state.pages.indexOf(activePage);
  const messages = [...(errors.rows.get(row.id) ?? []), ...[problems.get(`pages.${p}.rows.${index}.columns`)].filter((message): message is string => Boolean(message))];
  const tracks = [...widths.map((width) => `minmax(0, ${width}fr)`), ...(total < ROW_WIDTH ? [`${ROW_WIDTH - total}fr`] : [])].join(' ');
  const remove = () => (rowWidgetCount(row) > 0 ? setConfirming(true) : actions.removeRow(row.id));

  return <section ref={setNodeRef} data-builder-row={row.id} aria-label={`Row ${index + 1}`} style={{ transform: CSS.Translate.toString(transform), transition } as CSSProperties}
    className={cn('flex flex-col gap-2 rounded-xl border bg-card p-2 transition-[border-color,box-shadow] duration-150', selected ? 'border-primary ring-1 ring-primary' : messages.length ? 'border-destructive' : 'border-border', isDragging && 'z-10 opacity-40')}>
    <header className="flex items-center gap-1" onClick={(event) => { if (event.target === event.currentTarget) select({ kind: 'row', rowId: row.id }); }}>
      <button ref={setActivatorNodeRef} type="button" {...listeners} {...attributes} aria-label={`Move row ${index + 1}`} aria-roledescription="sortable row"
        className="inline-flex size-7 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing">
        <GripVerticalIcon className="size-4" />
      </button>
      <button type="button" onClick={() => select({ kind: 'row', rowId: row.id })} className="rounded-md px-1.5 py-0.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
        Row {index + 1} <span className="font-normal text-muted-foreground">· {splitLabel(widths)}</span>
      </button>
      <div className="ml-auto flex items-center gap-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="sm" disabled={locked}>Split<ChevronDownIcon /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SPLIT_PRESETS.map((preset) => <DropdownMenuItem key={preset.key} onSelect={() => actions.resplit(row.id, preset.widths)}><SplitIcon widths={preset.widths} />{preset.label}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Duplicate row ${index + 1}`} disabled={locked} onClick={() => actions.duplicateRow(row.id)}><CopyIcon /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete row ${index + 1}`} disabled={locked} className="hover:text-destructive" onClick={remove}><Trash2Icon /></Button>
      </div>
    </header>
    {messages.length ? <p className="px-1 text-xs text-destructive">{[...new Set(messages)].join(' ')}</p> : null}
    <div className="grid gap-2" style={{ gridTemplateColumns: tracks }}>
      {row.columns.map((block, blockIndex) => <BlockDropZone key={blockIndex} rowId={row.id} blockIndex={blockIndex} block={block} figures={figures} />)}
    </div>
    <ConfirmDialog open={confirming} onOpenChange={setConfirming} title={`Delete row ${index + 1}?`} description={`Its ${rowWidgetCount(row)} ${rowWidgetCount(row) === 1 ? 'widget is' : 'widgets are'} removed from the page. Nothing is saved until you press Save.`}
      confirmLabel="Delete row" onConfirm={async () => actions.removeRow(row.id)} />
  </section>;
}
