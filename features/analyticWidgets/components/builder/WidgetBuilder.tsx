import { DndContext, DragOverlay } from '@dnd-kit/core';
import axios from 'axios';
import { PanelLeftIcon, PanelRightIcon, RotateCcwIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmButton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '../../../../api/client';
import type { ApiFailure } from '../../../../api/types';
import { omitKeys } from '../../../analytics/lib/filters';
import type { AnalyticsFilterCatalog } from '../../../analytics/types/filters';
import { usePageFigures } from '../../hooks/useWidgetData';
import { useResetWidgetLayout, useSaveWidgetLayout } from '../../hooks/useWidgetLayout';
import { mapServerErrors } from '../../lib/errors';
import { METRICS_PER_PAGE_MAX, WIDGETS_PER_PAGE_MAX } from '../../lib/limits';
import { countMetrics, countWidgets, findPage } from '../../lib/layout';
import type { Catalog, WidgetFilters, WidgetLayout } from '../../types/analyticWidgets';
import { FiltersBar, WidgetsHeader } from '../WidgetsToolbar';
import { BuilderCanvas } from './BuilderCanvas';
import { DndUiContext } from './dndState';
import { DragPreview } from './DragPreview';
import { Inspector } from './Inspector';
import { PageTabs } from './PageTabs';
import type { CanvasFigures } from './RowCard';
import { useBuilderDnd } from './useBuilderDnd';
import { WidgetBuilderProvider, useBuilder } from './WidgetBuilderProvider';
import { WidgetPalette } from './WidgetPalette';

export interface BuilderExit { pageId?: string; reload?: boolean }

interface WidgetBuilderProps {
  layout: WidgetLayout; catalog: Catalog; activePageId: string;
  filters: WidgetFilters; filterCatalog: AnalyticsFilterCatalog; onFiltersChange: (filters: WidgetFilters) => void;
  onExit: (exit: BuilderExit) => void;
}

/** Customize mode: a working copy of the layout in a reducer, edited with drag and drop and the inspector. */
export function WidgetBuilder({ layout, catalog, activePageId, ...props }: WidgetBuilderProps) {
  const save = useSaveWidgetLayout();
  const reset = useResetWidgetLayout();
  return <WidgetBuilderProvider layout={layout} activePageId={activePageId} catalog={catalog} locked={save.isPending || reset.isPending}>
    <BuilderScreen save={save} reset={reset} {...props} />
  </WidgetBuilderProvider>;
}

const statusOf = (error: unknown) => (axios.isAxiosError<ApiFailure>(error) ? error.response?.status : undefined);

function BuilderScreen({ save, reset, filters, filterCatalog, onFiltersChange, onExit }: Omit<WidgetBuilderProps, 'layout' | 'catalog' | 'activePageId'> & { save: ReturnType<typeof useSaveWidgetLayout>; reset: ReturnType<typeof useResetWidgetLayout> }) {
  const builder = useBuilder();
  const { state, activePage, dirty, problems, errors, locked, catalog, select, setServerErrors } = builder;
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dnd = useBuilderDnd(canvasRef);
  const figures = usePageFigures(activePage, filters, (keys) => onFiltersChange({ ...filters, filters: omitKeys(filters.filters, keys) }));
  const [conflict, setConflict] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  // Set right before leaving customize mode, so the leave guard doesn't stop our own navigation.
  const leaving = useRef(false);

  const exit = useCallback((next: BuilderExit) => { leaving.current = true; onExit(next); }, [onExit]);

  // ---- Leaving with unsaved changes ----
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !leaving.current && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ---- Save, reset, cancel ----
  const widgetCount = countWidgets(activePage);
  const metricCount = countMetrics(activePage);
  const canSave = dirty && !locked && problems.size === 0;

  const onSave = () => save.mutate({ pages: state.pages, version: state.version }, {
    onSuccess: (layout) => { toast.success('Widgets saved'); exit({ pageId: findPage(layout.pages, state.activePageId) ? state.activePageId : layout.pages[0]?.id }); },
    onError: (error) => {
      const status = statusOf(error);
      if (status === 422 && axios.isAxiosError<ApiFailure>(error)) {
        const details = error.response?.data?.details ?? {};
        setServerErrors(details);
        const unmapped = mapServerErrors(state.pages, details).unmapped;
        if (unmapped.length || Object.keys(details).length === 0) toast.error(apiErrorMessage(error), { description: unmapped.map(({ path, messages }) => `${path}: ${messages.join(' ')}`).join('\n') || undefined });
        else toast.error('Some widgets need attention before they can be saved.');
      } else if (status === 409) setConflict(true);
      else if (status === 403) { toast.error(apiErrorMessage(error)); exit({}); }
      else toast.error(apiErrorMessage(error));
    },
  });

  const onReset = () => reset.mutateAsync(undefined, {
    onSuccess: (layout) => { toast.success('The default layout is back'); exit({ pageId: layout.pages[0]?.id }); },
    onError: (error) => { toast.error(apiErrorMessage(error)); if (statusOf(error) === 403) exit({}); },
  });

  const onCancel = () => (dirty ? setConfirmCancel(true) : exit({ pageId: state.activePageId }));

  const canvasFigures = useMemo<CanvasFigures>(() => ({
    data: figures.data, failed: figures.failed, onRetry: figures.onRetry,
    selectWidget: (widgetId: string) => select({ kind: 'widget', widgetId }),
  }), [figures.data, figures.failed, figures.onRetry, select]);

  const layoutMessages = useMemo(() => {
    const list: string[] = [...errors.layout];
    state.pages.forEach((page, p) => {
      const title = page.title.trim() || 'Untitled page';
      for (const message of [problems.get(`pages.${p}.title`), problems.get(`pages.${p}.rows`), ...(errors.pages.get(page.id) ?? [])]) {
        if (message) list.push(`${title}: ${message}`);
      }
    });
    if (problems.has('pages')) list.push(problems.get('pages') as string);
    return [...new Set(list)];
  }, [errors, problems, state.pages]);

  const liveMessage = dnd.intent?.kind === 'refuse' ? dnd.intent.message : dnd.refusal?.message ?? '';

  return <div className="flex flex-col gap-4">
    <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
      <WidgetsHeader title="Customize dashboard" customized={state.customized}>
        <span className="text-sm text-muted-foreground tabular-nums">
          <span className={cn(widgetCount >= WIDGETS_PER_PAGE_MAX && 'font-medium text-foreground')}>{widgetCount} of {WIDGETS_PER_PAGE_MAX} widgets</span>
          {' · '}
          <span className={cn(metricCount >= METRICS_PER_PAGE_MAX && 'font-medium text-foreground')}>{metricCount} of {METRICS_PER_PAGE_MAX} metrics</span>
        </span>
        <Button type="button" variant="outline" size="sm" className="lg:hidden" onClick={() => setPaletteOpen(true)}><PanelLeftIcon />Palette</Button>
        <Button type="button" variant="outline" size="sm" className="lg:hidden" onClick={() => setInspectorOpen(true)}><PanelRightIcon />Inspector</Button>
        {state.customized ? <Button type="button" variant="ghost" disabled={locked} onClick={() => setConfirmReset(true)}><RotateCcwIcon />Reset to default</Button> : null}
        <Button type="button" variant="outline" disabled={locked} onClick={onCancel}>Cancel</Button>
        <Button type="button" disabled={!canSave} onClick={onSave}>{save.isPending ? <Spinner /> : null}Save</Button>
      </WidgetsHeader>
      {layoutMessages.length ? <ul className="flex flex-col gap-0.5 text-sm text-destructive">{layoutMessages.map((message) => <li key={message}>{message}</li>)}</ul> : null}
    </div>

    <FiltersBar key={JSON.stringify([filters.from, filters.to, filters.filters])} filters={filters} catalog={filterCatalog} figures={figures.query}
      onApply={(applied) => onFiltersChange({ ...filters, ...applied })} onCurrency={(currency) => onFiltersChange({ ...filters, currency })} />

    <DndUiContext value={{ active: dnd.active, intent: dnd.intent, refusal: dnd.refusal }}>
      <DndContext sensors={dnd.sensors} collisionDetection={dnd.collisionDetection} accessibility={{ announcements: dnd.announcements }} {...dnd.handlers}>
        <PageTabs />
        <div className="grid items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)_20rem]">
          <aside aria-label="Palette" className="sticky top-24 hidden max-h-[calc(100svh-7rem)] overflow-y-auto rounded-xl border bg-card p-2 lg:block">
            <WidgetPalette />
          </aside>
          <BuilderCanvas figures={canvasFigures} canvasRef={canvasRef} />
          <aside aria-label="Inspector" className="sticky top-24 hidden max-h-[calc(100svh-7rem)] overflow-y-auto rounded-xl border bg-card p-4 lg:block">
            <Inspector />
          </aside>
        </div>
        {/* The palette sheet must stay inside the DndContext so its items can be dragged. */}
        <Sheet open={paletteOpen} onOpenChange={setPaletteOpen} modal={false}>
          <SheetContent side="left" className="w-72" aria-describedby={undefined}>
            <SheetHeader><SheetTitle>Palette</SheetTitle></SheetHeader>
            <div className="flex-1 overflow-y-auto px-2 pb-4"><WidgetPalette /></div>
          </SheetContent>
        </Sheet>
        <DragOverlay dropAnimation={null}>
          {dnd.active ? <DragPreview active={dnd.active} pages={state.pages} page={activePage} catalog={catalog} /> : null}
        </DragOverlay>
      </DndContext>
    </DndUiContext>
    <div role="status" aria-live="polite" className="sr-only">{liveMessage}</div>

    <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
      <SheetContent className="w-full data-[side=right]:sm:max-w-sm" aria-describedby={undefined}>
        <SheetHeader><SheetTitle>Inspector</SheetTitle></SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6"><Inspector /></div>
      </SheetContent>
    </Sheet>

    <ConfirmDialog open={confirmReset} onOpenChange={setConfirmReset} title="Reset to the default layout?" description="All your pages are replaced by the default layout. This cannot be undone." confirmLabel="Reset to default" onConfirm={onReset} />
    <ConfirmDialog open={confirmCancel} onOpenChange={setConfirmCancel} title="Discard your changes?" description="The changes you made since you started customizing are thrown away." confirmLabel="Discard changes" onConfirm={async () => exit({ pageId: state.activePageId })} />

    <AlertDialog open={conflict} onOpenChange={setConflict}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Your widgets were changed in another tab</AlertDialogTitle>
          <AlertDialogDescription>Reload to get the latest layout; your changes here are thrown away. If you keep editing, the next save will be refused again until you reload.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={() => exit({ reload: true, pageId: state.activePageId })}>Reload</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={blocker.state === 'blocked'} onOpenChange={(open) => { if (!open && blocker.state === 'blocked') blocker.reset(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
          <AlertDialogDescription>Your widget changes have not been saved. They are lost if you leave this page.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.reset?.()}>Stay</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => blocker.proceed?.()}>Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
