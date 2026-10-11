import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CircleAlertIcon, GripVerticalIcon, XIcon } from 'lucide-react';
import { memo, type CSSProperties, type KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Catalog, MetricAnswer, Widget } from '../../types/analyticWidgets';
import { WidgetCard } from '../view/WidgetCard';
import { refusalFor, useDndUi } from './dndState';
import { widgetDndId } from './dnd';

interface BuilderWidgetCardProps {
  widget: Widget; catalog: Catalog; answers: MetricAnswer[] | undefined; failed: boolean; currency: string | null; width: number;
  selected: boolean; errorCount: number; disabled: boolean;
  onSelect: (widgetId: string) => void; onRemove: (widgetId: string) => void; onRetry: () => void;
}

/** A sortable widget card; it is also the drop target for "add this metric to the widget". */
export const BuilderWidgetCard = memo(function BuilderWidgetCard({ widget, catalog, answers, failed, currency, width, selected, errorCount, disabled, onSelect, onRemove, onRetry }: BuilderWidgetCardProps) {
  const id = widgetDndId(widget.id);
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, transition, isDragging } = useSortable({ id, data: { type: 'widget', widgetId: widget.id }, disabled });
  const ui = useDndUi();
  const adding = ui.intent?.kind === 'add-to-widget' && ui.intent.widgetId === widget.id;
  const refusal = refusalFor(ui, id);
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
  const selectOnKey = (event: KeyboardEvent) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(widget.id); } };

  return <div ref={setNodeRef} style={style} className={cn('relative', isDragging && 'z-10 opacity-40')}>
    <div role="button" tabIndex={0} aria-pressed={selected} aria-label={`Select widget`} onClick={() => onSelect(widget.id)} onKeyDown={selectOnKey}
      className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <WidgetCard widget={widget} catalog={catalog} answers={answers} failed={failed} currency={currency} width={width} builder onRetry={onRetry}
        className={cn('cursor-pointer transition-shadow duration-150', selected && 'ring-2 ring-primary', errorCount > 0 && 'ring-2 ring-destructive', (adding || refusal) && 'ring-2', adding && 'ring-primary', refusal && 'ring-destructive')}
        leading={<button ref={setActivatorNodeRef} type="button" {...listeners} {...attributes} aria-label="Move widget" aria-roledescription="sortable widget"
          onClick={(event) => event.stopPropagation()}
          className="-ml-1 inline-flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing">
          <GripVerticalIcon className="size-3.5" />
        </button>}
        actions={<>
          {errorCount > 0 ? <Badge variant="destructive"><CircleAlertIcon />{errorCount}</Badge> : null}
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Remove widget" disabled={disabled} onClick={(event) => { event.stopPropagation(); onRemove(widget.id); }}><XIcon /></Button>
        </>}
      />
    </div>
    {adding || refusal ? <div aria-hidden className={cn('pointer-events-none absolute inset-x-3 bottom-3 rounded-md px-2 py-1 text-center text-xs font-medium shadow-sm', adding ? 'bg-primary text-primary-foreground' : 'bg-destructive text-white')}>
      {adding ? 'Add to this widget' : refusal}
    </div> : null}
  </div>;
});
