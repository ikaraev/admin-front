import { cn } from '@/lib/utils';

/** A tiny picture of a row split: one bar per block, in proportion. */
export function SplitIcon({ widths, className }: { widths: number[]; className?: string }) {
  return <span aria-hidden className={cn('grid h-3.5 w-7 shrink-0 gap-0.5', className)} style={{ gridTemplateColumns: widths.map((width) => `${width}fr`).join(' ') }}>
    {widths.map((_, i) => <span key={i} className="rounded-[2px] bg-current opacity-60" />)}
  </span>;
}
