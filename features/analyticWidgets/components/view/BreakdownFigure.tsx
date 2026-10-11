import { formatValue } from '../../lib/format';
import { isMetricError, type MetricAnswer } from '../../types/analyticWidgets';
import { MetricErrorNote } from './MetricErrorNote';

/** A ranked list in the server's order, with a thin bar relative to the largest value. */
export function BreakdownFigure({ answer, onRetry }: { answer: MetricAnswer | undefined; onRetry?: () => void }) {
  if (!answer) return null;
  if (isMetricError(answer)) return <MetricErrorNote answer={answer} onRetry={onRetry} />;
  if (answer.display !== 'breakdown') return null;
  if (answer.items.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">Nothing to show for these dates.</p>;
  const max = Math.max(...answer.items.map((item) => Math.abs(Number(item.value ?? 0)) || 0), 0);
  return <ol className="flex flex-col gap-2.5">
    {answer.items.map((item, index) => {
      const share = max > 0 ? Math.abs(Number(item.value ?? 0)) / max : 0;
      const negative = Number(item.value ?? 0) < 0;
      return <li key={`${item.key}-${index}`} className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="min-w-0 truncate" title={item.label}>{item.label}</span>
          <span className="shrink-0 font-medium tabular-nums">{formatValue(item.value, answer.unit, answer.currency)}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div className={negative ? 'h-full rounded-full bg-destructive/70' : 'h-full rounded-full bg-foreground/60'} style={{ width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%` }} />
        </div>
      </li>;
    })}
  </ol>;
}
