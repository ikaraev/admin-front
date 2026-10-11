import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  danger: 'bg-red-50 text-red-700 ring-red-600/20',
  neutral: 'bg-muted text-muted-foreground ring-foreground/10',
};

export function StatusBadge({ tone, children }: { tone: StatusTone; children: string }) {
  return <Badge variant="outline" className={cn('border-0 capitalize ring-1 ring-inset', toneClasses[tone])}>{children}</Badge>;
}
