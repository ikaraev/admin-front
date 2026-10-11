import { horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CopyIcon, EllipsisVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmButton';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PAGE_TITLE_MAX, PAGES_MAX } from '../../lib/limits';
import { addPage, duplicatePage, newPage, pageWidgetCount, removePage, renamePage } from '../../lib/layout';
import type { LayoutPage } from '../../types/analyticWidgets';
import { TABS_ID, tabId } from './dnd';
import { useBuilder } from './WidgetBuilderProvider';

/** The page tabs of the builder: sortable, renamed inline, with Duplicate and Delete in a menu. */
export function PageTabs() {
  const { state, locked, edit, activate, errors, problems } = useBuilder();
  const items = useMemo(() => state.pages.map((page) => tabId(page.id)), [state.pages]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<LayoutPage | null>(null);
  const full = state.pages.length >= PAGES_MAX;
  const add = () => { const page = newPage(); edit((pages) => addPage(pages, page), 'all', { activePageId: page.id }); setRenaming(page.id); };
  const remove = (page: LayoutPage) => (pageWidgetCount(page) > 0 ? setDeleting(page) : edit((pages) => removePage(pages, page.id), 'all'));

  return <div className="flex min-w-0 flex-wrap items-center gap-1" role="tablist" aria-label="Pages">
    <SortableContext id={TABS_ID} items={items} strategy={horizontalListSortingStrategy}>
      {state.pages.map((page, p) => <PageTab key={page.id} page={page} active={page.id === state.activePageId} disabled={locked}
        hasError={errors.pages.has(page.id) || problems.has(`pages.${p}.title`) || problems.has(`pages.${p}.rows`) || [...errors.widgets.keys()].some((id) => page.rows.some((row) => row.columns.some((block) => block.widgets.some((widget) => widget.id === id))))}
        renaming={renaming === page.id} canDelete={state.pages.length > 1} canDuplicate={!full}
        onActivate={() => activate(page.id)} onRenameStart={() => setRenaming(page.id)} onRenameEnd={() => setRenaming(null)}
        onRename={(title) => edit((pages) => renamePage(pages, page.id, title), { pageId: page.id })}
        onDuplicate={() => edit((pages) => duplicatePage(pages, page.id).pages, 'all')}
        onDelete={() => remove(page)} />)}
    </SortableContext>
    <Tooltip>
      <TooltipTrigger asChild><span tabIndex={full ? 0 : -1}>
        <Button type="button" variant="ghost" size="sm" disabled={full || locked} onClick={add}><PlusIcon />Page</Button>
      </span></TooltipTrigger>
      {full ? <TooltipContent>A layout holds at most {PAGES_MAX} pages.</TooltipContent> : null}
    </Tooltip>
    <ConfirmDialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }} title={`Delete “${deleting?.title ?? ''}”?`}
      description="The page and its widgets are removed. Nothing is saved until you press Save." confirmLabel="Delete page"
      onConfirm={async () => { if (deleting) edit((pages) => removePage(pages, deleting.id), 'all'); }} />
  </div>;
}

interface PageTabProps {
  page: LayoutPage; active: boolean; disabled: boolean; hasError: boolean; renaming: boolean; canDelete: boolean; canDuplicate: boolean;
  onActivate: () => void; onRenameStart: () => void; onRenameEnd: () => void; onRename: (title: string) => void; onDuplicate: () => void; onDelete: () => void;
}

function PageTab({ page, active, disabled, hasError, renaming, canDelete, canDuplicate, onActivate, onRenameStart, onRenameEnd, onRename, onDuplicate, onDelete }: PageTabProps) {
  const { setNodeRef, listeners, attributes, transform, transition, isDragging } = useSortable({ id: tabId(page.id), data: { type: 'tab', pageId: page.id }, disabled: disabled || renaming });
  const empty = page.title.trim().length === 0;

  return <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}
    className={cn('group flex h-8 items-center rounded-lg border text-sm transition-colors duration-150', active ? 'border-border bg-background shadow-xs' : 'border-transparent bg-muted/60 hover:bg-muted', isDragging && 'z-10 opacity-40')}>
    {renaming ? <RenameInput title={page.title} onChange={onRename} onDone={onRenameEnd} /> : <button type="button" {...listeners} {...attributes} role="tab" aria-selected={active}
      onClick={onActivate} onDoubleClick={onRenameStart}
      className={cn('relative flex h-full max-w-48 touch-none items-center gap-1.5 rounded-lg pr-1 pl-3 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50', empty && 'text-muted-foreground italic')}>
      <span className="truncate">{empty ? 'Untitled' : page.title}</span>
      {hasError ? <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-label="Has errors" /> : null}
    </button>}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" className="mr-0.5" aria-label={`Page “${page.title}” options`} disabled={disabled}><EllipsisVerticalIcon /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(event) => event.preventDefault()}>
        <DropdownMenuItem onSelect={onRenameStart}><PencilIcon />Rename</DropdownMenuItem>
        <DropdownMenuItem disabled={!canDuplicate} onSelect={onDuplicate}><CopyIcon />Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={!canDelete} onSelect={onDelete}><Trash2Icon />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

function RenameInput({ title, onChange, onDone }: { title: string; onChange: (title: string) => void; onDone: () => void }) {
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); onDone(); } };
  const empty = title.trim().length === 0;
  return <span className="flex items-center gap-1 pl-1">
    <input autoFocus value={title} maxLength={PAGE_TITLE_MAX} aria-label="Page title" aria-invalid={empty || undefined} onChange={(event) => onChange(event.target.value)} onBlur={onDone} onKeyDown={keyDown}
      onFocus={(event) => event.currentTarget.select()}
      className="h-6 w-36 rounded-md border bg-background px-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive" />
    <span className={cn('text-xs tabular-nums', empty ? 'text-destructive' : 'text-muted-foreground')}>{title.length}/{PAGE_TITLE_MAX}</span>
  </span>;
}
