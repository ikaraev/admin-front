import { InfoIcon } from 'lucide-react';
import { memo, useRef, useState, type PointerEvent } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Catalog, MetricDefinition } from '../../types/analyticWidgets';

const HOVER_CLOSE_DELAY = 120;

/**
 * "About this metric": the catalog description of each metric of a widget. Opens on click, tap,
 * Enter and Space (a popover, since tooltips don't open on touch), and on mouse hover.
 */
export const MetricInfo = memo(function MetricInfo({ metrics, catalog }: { metrics: string[]; catalog: Catalog }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const known = metrics.map((key) => catalog.get(key)).filter((metric): metric is MetricDefinition => Boolean(metric));
  if (known.length === 0) return null;

  const hover = (next: boolean) => (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    window.clearTimeout(closeTimer.current);
    if (next) setOpen(true);
    else closeTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
  };

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <button
        type="button" aria-label="About this metric"
        // A drag must never start from the info icon.
        onPointerDownCapture={(event) => event.stopPropagation()}
        onPointerEnter={hover(true)} onPointerLeave={hover(false)}
        className="-my-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 outline-none transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <InfoIcon className="size-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-80 gap-3" onPointerEnter={hover(true)} onPointerLeave={hover(false)} onOpenAutoFocus={(event) => event.preventDefault()}>
      {known.map((metric) => <div key={metric.key} className="flex flex-col gap-0.5">
        <p className="font-medium">{metric.label}</p>
        <p className="text-muted-foreground">{metric.description}</p>
      </div>)}
    </PopoverContent>
  </Popover>;
});
