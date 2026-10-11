import { memo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { widgetSubtitle, widgetTitle } from '../../lib/format';
import { isMetricError, type Catalog, type MetricAnswer, type Widget } from '../../types/analyticWidgets';
import { BreakdownFigure } from './BreakdownFigure';
import { MetricInfo } from './MetricInfo';
import { NumberFigure } from './NumberFigure';
import { TrendFigure } from './TrendFigure';

/** Chart height by block width; the builder shows charts at half height. */
function chartHeight(width: number, builder = false) {
  const height = width <= 4 ? 160 : width <= 8 ? 200 : 240;
  return builder ? height / 2 : height;
}

export interface WidgetCardProps {
  widget: Widget;
  catalog: Catalog;
  /** The widget's answers, in the order of its metrics; undefined while they load. */
  answers: MetricAnswer[] | undefined;
  /** No figures at all (the whole batch failed): show "—". */
  failed?: boolean;
  /** Reporting currency of the batch, for the subtitle. */
  currency: string | null;
  /** Width of the widget's block, in twelfths. */
  width: number;
  builder?: boolean;
  onRetry?: () => void;
  /** Builder slots: a drag grip before the title and actions after it. */
  leading?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export const WidgetCard = memo(function WidgetCard({ widget, catalog, answers, failed = false, currency, width, builder = false, onRetry, leading, actions, footer, className }: WidgetCardProps) {
  const title = widgetTitle(widget, catalog);
  const staleHint = builder && answers?.some((answer) => isMetricError(answer) && answer.error.code === 'unknown_metric');
  return <Card size={builder ? 'sm' : undefined} className={cn('min-w-0', className)}>
    <CardHeader className="gap-0.5">
      <div className="flex min-w-0 items-center gap-1">
        {leading}
        <h3 className="min-w-0 truncate text-sm font-medium" title={title}>{title}</h3>
        <MetricInfo metrics={widget.metrics} catalog={catalog} />
        {actions ? <div className="ml-auto flex shrink-0 items-center gap-0.5">{actions}</div> : null}
      </div>
      <p className="truncate text-xs text-muted-foreground">{widgetSubtitle(widget, catalog, currency)}</p>
    </CardHeader>
    <CardContent>
      <WidgetBody widget={widget} catalog={catalog} answers={answers} failed={failed} width={width} builder={builder} onRetry={onRetry} />
      {staleHint ? <p className="mt-2 text-xs text-muted-foreground">This metric is no longer available. Remove it in the inspector.</p> : null}
      {footer}
    </CardContent>
  </Card>;
});

function WidgetBody({ widget, catalog, answers, failed, width, builder, onRetry }: Pick<WidgetCardProps, 'widget' | 'catalog' | 'answers' | 'failed' | 'width' | 'builder' | 'onRetry'>) {
  const height = chartHeight(width, builder);
  if (failed) return <p className="text-3xl font-semibold text-muted-foreground">—</p>;
  if (!answers) return <WidgetSkeleton widget={widget} height={height} />;
  if (widget.display === 'trend') return <TrendFigure answers={answers} catalog={catalog} height={height} onRetry={onRetry} />;
  if (widget.display === 'breakdown') return <BreakdownFigure answer={answers[0]} onRetry={onRetry} />;
  return <NumberFigure answers={answers} catalog={catalog} compact={width <= 3 || Boolean(builder)} onRetry={onRetry} />;
}

export function WidgetSkeleton({ widget, height }: { widget: Widget; height: number }) {
  if (widget.display === 'trend') return <Skeleton className="w-full" style={{ height }} />;
  if (widget.display === 'breakdown') {
    return <div className="flex flex-col gap-3">{Array.from({ length: Math.min(widget.limit, 8) }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>;
  }
  if (widget.metrics.length > 1) return <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">{widget.metrics.map((key) => <Skeleton key={key} className="h-16" />)}</div>;
  return <Skeleton className="h-9 w-32" />;
}
