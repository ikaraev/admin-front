import { ChevronLeftIcon, ChevronRightIcon, InboxIcon, RefreshCwIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ErrorState, LoadingState } from '@/components/feedback/QueryState';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Page } from '../api/adminApi';

/** Page body; the title is shown in the site header. */
export function AdminPage({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return <div className="flex flex-col gap-6">
    {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
    {children}
  </div>;
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return <div className="flex flex-col gap-1"><h2 className="text-base font-semibold">{title}</h2>{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}</div>;
}

/** `className` applies to header and cells (alignment); `cellClassName` to body cells only. */
export type Column<T> = { key: string; title: ReactNode; render?: (row: T) => ReactNode; className?: string; cellClassName?: string };

function cellValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function DataTable<T extends object>({ rows, columns, rowKey, loading = false, emptyText = 'No records found.', emptyDescription = 'Records will appear here once they exist.' }: { rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; loading?: boolean; emptyText?: string; emptyDescription?: string }) {
  if (loading && rows.length === 0) return <LoadingState />;
  if (rows.length === 0) return <Empty className="border"><EmptyHeader><EmptyMedia variant="icon"><InboxIcon /></EmptyMedia><EmptyTitle>{emptyText}</EmptyTitle><EmptyDescription>{emptyDescription}</EmptyDescription></EmptyHeader></Empty>;
  return <div className={cn('relative rounded-lg border bg-card transition-opacity duration-150', loading && 'opacity-60')}>
    <Table>
      <TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key} className={column.className}>{column.title}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map((row) => <TableRow key={rowKey(row)}>{columns.map((column) => <TableCell key={column.key} className={cn(column.className, column.cellClassName)}>{column.render ? column.render(row) : cellValue((row as Record<string, unknown>)[column.key])}</TableCell>)}</TableRow>)}</TableBody>
    </Table>
  </div>;
}

/** `fetching` dims the rows while a new page or filter loads over the previous one. */
export function ServerTable<T extends { uuid?: string; code?: string }>({ page, loading, fetching = false, error, columns, onChange, emptyText, emptyDescription }: { page?: Page<T>; loading: boolean; fetching?: boolean; error: unknown; columns: Column<T>[]; onChange?: (page: number) => void; emptyText?: string; emptyDescription?: string }) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="The server request failed. Try again." />;
  const current = page?.page ?? 1;
  const totalPages = page?.totalPages ?? 1;
  return <div className="flex flex-col gap-3">
    <DataTable rows={page?.items ?? []} columns={columns} rowKey={(record) => record.uuid ?? record.code ?? JSON.stringify(record)} loading={fetching} emptyText={emptyText} emptyDescription={emptyDescription} />
    {page && page.total > 0 ? <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>{page.total} {page.total === 1 ? 'record' : 'records'}</span>
      {onChange && totalPages > 1 ? <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={current <= 1} onClick={() => onChange(current - 1)}><ChevronLeftIcon /></Button>
        <span className="tabular-nums">Page {current} of {totalPages}</span>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={current >= totalPages} onClick={() => onChange(current + 1)}><ChevronRightIcon /></Button>
      </div> : null}
    </div> : null}
  </div>;
}

export const ReloadButton = ({ onClick, pending = false }: { onClick: () => void; pending?: boolean }) => <Button variant="outline" onClick={onClick} disabled={pending}>{pending ? <Spinner /> : <RefreshCwIcon />}Refresh</Button>;

/** Right-hand drawer for create/edit forms. Children are unmounted on close, so forms reset. */
export function FormSheet({ open, onClose, title, description, wide = false, children }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; wide?: boolean; children: ReactNode }) {
  return <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
    <SheetContent className={cn('w-full data-[side=right]:sm:max-w-md', wide && 'data-[side=right]:sm:max-w-xl')} {...(description ? {} : { 'aria-describedby': undefined })}>
      <SheetHeader><SheetTitle>{title}</SheetTitle>{description ? <SheetDescription>{description}</SheetDescription> : null}</SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 pb-6">{children}</div>
    </SheetContent>
  </Sheet>;
}

export const rowActionsClassName = 'flex flex-wrap items-center justify-end gap-1';
