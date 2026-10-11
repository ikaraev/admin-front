import { memo, type CSSProperties } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { rowWidgetCount } from '../../lib/layout';
import type { Catalog, LayoutPage, LayoutRow, WidgetData } from '../../types/analyticWidgets';
import { WidgetCard } from './WidgetCard';

export interface FiguresState {
  data: WidgetData | undefined;
  /** The whole batch failed: cards show "—". */
  failed: boolean;
  onRetry: () => void;
}

/** A row is a 12-column grid; each block spans its width. Below `md` every block spans 12, so they stack. */
export const LayoutRowView = memo(function LayoutRowView({ row, catalog, figures }: { row: LayoutRow; catalog: Catalog; figures: FiguresState }) {
  if (rowWidgetCount(row) === 0) return null;
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
    {row.columns.map((block, blockIndex) => <div key={blockIndex} className="flex min-w-0 flex-col gap-4 md:col-span-(--span)" style={{ '--span': block.width } as CSSProperties}>
      {block.widgets.map((widget) => {
        const answers = figures.data?.results[widget.id]?.metrics;
        return <WidgetCard key={widget.id} widget={widget} catalog={catalog} answers={answers} failed={figures.failed && !answers} currency={figures.data?.currency ?? null} width={block.width} onRetry={figures.onRetry} />;
      })}
    </div>)}
  </div>;
});

export function WidgetPageView({ page, catalog, figures }: { page: LayoutPage; catalog: Catalog; figures: FiguresState }) {
  return <div className="flex flex-col gap-4">
    {page.rows.map((row) => <LayoutRowView key={row.id} row={row} catalog={catalog} figures={figures} />)}
  </div>;
}

export function WidgetsSkeleton() {
  return <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading widgets">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
    <Skeleton className="h-80 rounded-xl" />
  </div>;
}
