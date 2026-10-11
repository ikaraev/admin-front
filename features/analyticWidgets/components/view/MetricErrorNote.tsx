import { CircleAlertIcon, RotateCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MetricError } from '../../types/analyticWidgets';

/** An error item in its metric's place. `unavailable` is transient, so it offers a retry. */
export function MetricErrorNote({ answer, label, onRetry, hint }: { answer: MetricError; label?: string; onRetry?: () => void; hint?: string }) {
  return <div className="flex items-start gap-2 text-sm text-muted-foreground">
    <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
    <div className="flex min-w-0 flex-col gap-1">
      <p>{label ? <span className="font-medium text-foreground">{label}: </span> : null}{answer.error.message}</p>
      {hint ? <p className="text-xs">{hint}</p> : null}
      {answer.error.code === 'unavailable' && onRetry ? <Button type="button" variant="outline" size="xs" className="self-start" onClick={onRetry}><RotateCwIcon />Retry</Button> : null}
    </div>
  </div>;
}
