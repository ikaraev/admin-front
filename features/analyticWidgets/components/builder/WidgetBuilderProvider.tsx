/* eslint-disable react-refresh/only-export-components -- the provider and its hook belong together */
import { createContext, use, useMemo, useReducer, type ReactNode } from 'react';
import { firstPageWithErrors, mapServerErrors, type MappedErrors, type ServerErrors } from '../../lib/errors';
import { deepEqual, findPage, locateWidget, pageOfRow, problems } from '../../lib/layout';
import type { Catalog, LayoutPage, WidgetLayout } from '../../types/analyticWidgets';

export type Selection =
  | { kind: 'row'; rowId: string }
  | { kind: 'widget'; widgetId: string }
  | { kind: 'block'; rowId: string; blockIndex: number }
  | null;

/** Which server errors an edit makes stale. Structural edits clear them all: paths are positional. */
export type ErrorScope = 'all' | 'none' | { widgetId: string } | { rowId: string } | { pageId: string };

export interface BuilderState {
  /** The working copy. */
  pages: LayoutPage[];
  /** The pages as last loaded or saved, to measure "dirty" against. */
  saved: LayoutPage[];
  version: number;
  customized: boolean;
  activePageId: string;
  selection: Selection;
  serverErrors: ServerErrors;
}

type Action =
  | { type: 'edit'; update: (pages: LayoutPage[]) => LayoutPage[]; clear: ErrorScope; select?: Selection; activePageId?: string }
  | { type: 'preview'; pages: LayoutPage[] }
  | { type: 'select'; selection: Selection }
  | { type: 'activate'; pageId: string }
  | { type: 'serverErrors'; errors: ServerErrors };

function prefixesFor(pages: LayoutPage[], scope: Exclude<ErrorScope, 'all' | 'none'>): (path: string) => boolean {
  if ('widgetId' in scope) {
    const at = locateWidget(pages, scope.widgetId);
    if (!at) return () => false;
    const p = pages.findIndex((page) => page.id === at.pageId); const r = pages[p].rows.findIndex((row) => row.id === at.rowId);
    const prefix = `pages.${p}.rows.${r}.columns.${at.blockIndex}.widgets.${at.index}`;
    return (path) => path === prefix || path.startsWith(`${prefix}.`);
  }
  if ('rowId' in scope) {
    const page = pageOfRow(pages, scope.rowId);
    if (!page) return () => false;
    const prefix = `pages.${pages.indexOf(page)}.rows.${page.rows.findIndex((row) => row.id === scope.rowId)}.columns`;
    return (path) => path === prefix || /^\.\d+\.width$/.test(path.slice(prefix.length)) && path.startsWith(prefix);
  }
  const p = pages.findIndex((page) => page.id === scope.pageId);
  return (path) => path === `pages.${p}.title` || path === `pages.${p}.rows` || path === 'pages';
}

function clearErrors(state: BuilderState, scope: ErrorScope): ServerErrors {
  if (scope === 'none' || Object.keys(state.serverErrors).length === 0) return state.serverErrors;
  if (scope === 'all') return {};
  const stale = prefixesFor(state.pages, scope);
  const next = Object.fromEntries(Object.entries(state.serverErrors).filter(([path]) => !stale(path)));
  return Object.keys(next).length === Object.keys(state.serverErrors).length ? state.serverErrors : next;
}

/** Keeps the selection pointing at something that still exists. */
function validSelection(pages: LayoutPage[], selection: Selection): Selection {
  if (!selection) return null;
  if (selection.kind === 'widget') return locateWidget(pages, selection.widgetId) ? selection : null;
  const page = pageOfRow(pages, selection.rowId);
  if (!page) return null;
  if (selection.kind === 'block') return page.rows.find((row) => row.id === selection.rowId)!.columns[selection.blockIndex] ? selection : null;
  return selection;
}

function reducer(state: BuilderState, action: Action): BuilderState {
  switch (action.type) {
    case 'edit': {
      const pages = action.update(state.pages);
      const activePageId = action.activePageId && findPage(pages, action.activePageId) ? action.activePageId : findPage(pages, state.activePageId) ? state.activePageId : pages[0]?.id ?? '';
      const selection = validSelection(pages, action.select !== undefined ? action.select : state.selection);
      if (pages === state.pages && activePageId === state.activePageId && selection === state.selection) return state;
      return { ...state, serverErrors: pages === state.pages ? state.serverErrors : clearErrors(state, action.clear), pages, activePageId, selection };
    }
    case 'preview':
      return action.pages === state.pages ? state : { ...state, pages: action.pages, selection: validSelection(action.pages, state.selection) };
    case 'select':
      return deepEqual(action.selection, state.selection) ? state : { ...state, selection: action.selection };
    case 'activate':
      return action.pageId === state.activePageId || !findPage(state.pages, action.pageId) ? state : { ...state, activePageId: action.pageId, selection: null };
    case 'serverErrors': {
      const first = firstPageWithErrors(state.pages, action.errors);
      return { ...state, serverErrors: action.errors, activePageId: first ?? state.activePageId };
    }
  }
}

export interface BuilderContextValue {
  state: BuilderState;
  catalog: Catalog;
  activePage: LayoutPage;
  dirty: boolean;
  /** Client-side rule problems, keyed by server path. */
  problems: Map<string, string>;
  /** Server 422 messages mapped onto pages, rows and widgets. */
  errors: MappedErrors;
  /** True while a save or reset is in flight: drag and the inspector are disabled. */
  locked: boolean;
  edit: (update: (pages: LayoutPage[]) => LayoutPage[], clear: ErrorScope, options?: { select?: Selection; activePageId?: string }) => void;
  preview: (pages: LayoutPage[]) => void;
  select: (selection: Selection) => void;
  activate: (pageId: string) => void;
  setServerErrors: (errors: ServerErrors) => void;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

export function useBuilder(): BuilderContextValue {
  const value = use(BuilderContext);
  if (!value) throw new Error('useBuilder must be used inside <WidgetBuilderProvider>');
  return value;
}

function init({ layout, activePageId }: { layout: WidgetLayout; activePageId: string }): BuilderState {
  return {
    pages: layout.pages, saved: layout.pages, version: layout.version, customized: layout.customized,
    activePageId: findPage(layout.pages, activePageId) ? activePageId : layout.pages[0]?.id ?? '', selection: null, serverErrors: {},
  };
}

/**
 * The working copy of the layout while customizing. It is client state, so it lives in a
 * reducer rather than in React Query; the pure operations of `lib/layout.ts` do the edits.
 */
export function WidgetBuilderProvider({ layout, activePageId, catalog, locked, children }: { layout: WidgetLayout; activePageId: string; catalog: Catalog; locked: boolean; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { layout, activePageId }, init);
  const actions = useMemo(() => ({
    edit: (update: (pages: LayoutPage[]) => LayoutPage[], clear: ErrorScope, options: { select?: Selection; activePageId?: string } = {}) => dispatch({ type: 'edit', update, clear, ...options }),
    preview: (pages: LayoutPage[]) => dispatch({ type: 'preview', pages }),
    select: (selection: Selection) => dispatch({ type: 'select', selection }),
    activate: (pageId: string) => dispatch({ type: 'activate', pageId }),
    setServerErrors: (errors: ServerErrors) => dispatch({ type: 'serverErrors', errors }),
  }), []);
  const dirty = useMemo(() => !deepEqual(state.pages, state.saved), [state.pages, state.saved]);
  const found = useMemo(() => problems(state.pages), [state.pages]);
  const errors = useMemo(() => mapServerErrors(state.pages, state.serverErrors), [state.pages, state.serverErrors]);
  const activePage = findPage(state.pages, state.activePageId) ?? state.pages[0];
  const value = useMemo<BuilderContextValue>(() => ({ state, catalog, activePage, dirty, problems: found, errors, locked, ...actions }), [state, catalog, activePage, dirty, found, errors, locked, actions]);
  return <BuilderContext value={value}>{children}</BuilderContext>;
}
