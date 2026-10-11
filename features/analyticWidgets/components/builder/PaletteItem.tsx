import { useDraggable } from '@dnd-kit/core';
import { GripVerticalIcon, PlusIcon } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DragData } from './dnd';

/** A palette entry: the item itself is the pointer drag handle; the trailing + adds it by click or keyboard. */
export const PaletteItem = memo(function PaletteItem({ id, data, label, detail, icon, disabledReason, addLabel, onAdd }: {
  id: string; data: DragData; label: string; detail?: string; icon?: ReactNode; disabledReason: string | null; addLabel: string; onAdd: () => void;
}) {
  const disabled = disabledReason !== null;
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id, data, disabled });
  const item = <div className={cn('group flex items-center gap-2 rounded-md py-1 pr-1 pl-1.5 text-sm transition-colors duration-150', disabled ? 'opacity-50' : 'hover:bg-muted', isDragging && 'opacity-40')}>
    <div ref={setNodeRef} {...listeners} {...attributes} tabIndex={-1} aria-label={`Drag ${label}`}
      className={cn('flex min-w-0 flex-1 touch-none items-center gap-2 select-none', disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing')}>
      <GripVerticalIcon className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
      {icon}
      <div className="flex min-w-0 flex-col">
        <span className="truncate">{label}</span>
        {detail ? <span className="truncate text-xs text-muted-foreground">{detail}</span> : null}
      </div>
    </div>
    <Button type="button" variant="ghost" size="icon-xs" aria-label={addLabel} disabled={disabled} onClick={onAdd}><PlusIcon /></Button>
  </div>;
  if (!disabled) return item;
  return <Tooltip><TooltipTrigger asChild><div>{item}</div></TooltipTrigger><TooltipContent side="right">{disabledReason}</TooltipContent></Tooltip>;
});
