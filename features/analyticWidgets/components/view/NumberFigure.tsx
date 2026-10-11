import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { change, formatChange, formatValue, metricLabel } from '../../lib/format';
import { isMetricError, type Catalog, type MetricAnswer, type NumberFigure as NumberAnswer } from '../../types/analyticWidgets';
import { MetricErrorNote } from './MetricErrorNote';

function ChangeBadge({ answer }: { answer: NumberAnswer }) {
  const ratio = change(answer.value, answer.previous);
  if (ratio === null) return null;
  const up = ratio >= 0;
  const Icon = up ? ArrowUpIcon : ArrowDownIcon;
  const title = answer.previous_period ? `Against ${answer.previous_period.from} – ${answer.previous_period.to}: ${formatValue(answer.previous, answer.unit, answer.currency)}` : undefined;
  return <span title={title} className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums', up ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-700 dark:text-red-400')}>
    <Icon className="size-3" aria-hidden /><span className="sr-only">{up ? 'Up' : 'Down'} </span>{formatChange(ratio)}
  </span>;
}

/** One metric: a large value and, with compare, the change against the previous period. */
function SingleNumber({ answer, compact, onRetry }: { answer: MetricAnswer; compact: boolean; onRetry?: () => void }) {
  if (isMetricError(answer)) return <MetricErrorNote answer={answer} onRetry={onRetry} />;
  if (answer.display !== 'number') return null;
  return <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
    <span className={cn('font-semibold tracking-tight tabular-nums', compact ? 'text-2xl' : 'text-3xl')}>{formatValue(answer.value, answer.unit, answer.currency, compact && answer.unit === 'count')}</span>
    <ChangeBadge answer={answer} />
  </div>;
}

/** Several metrics: a tile per metric that wraps in a narrow block. */
function NumberTiles({ answers, catalog, onRetry }: { answers: MetricAnswer[]; catalog: Catalog; onRetry?: () => void }) {
  const unavailable = answers.filter(isMetricError).find((answer) => answer.error.code === 'unavailable');
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
    {answers.map((answer) => <div key={answer.metric} className="flex min-w-0 flex-col gap-1 rounded-lg bg-muted/40 p-2.5">
      <span className="truncate text-xs text-muted-foreground">{metricLabel(answer.metric, catalog)}</span>
      {isMetricError(answer) ? <Tooltip>
        <TooltipTrigger asChild><span tabIndex={0} className="self-start text-xl font-semibold text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50">—</span></TooltipTrigger>
        <TooltipContent>{answer.error.message}</TooltipContent>
      </Tooltip> : answer.display === 'number' ? <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xl font-semibold tracking-tight tabular-nums">{formatValue(answer.value, answer.unit, answer.currency, answer.unit === 'count')}</span>
        <ChangeBadge answer={answer} />
      </div> : null}
    </div>)}
    {unavailable && onRetry ? <div className="col-span-full"><MetricErrorNote answer={unavailable} onRetry={onRetry} /></div> : null}
  </div>;
}

export function NumberFigure({ answers, catalog, compact, onRetry }: { answers: MetricAnswer[]; catalog: Catalog; compact: boolean; onRetry?: () => void }) {
  if (answers.length === 1) return <SingleNumber answer={answers[0]} compact={compact} onRetry={onRetry} />;
  return <NumberTiles answers={answers} catalog={catalog} onRetry={onRetry} />;
}
