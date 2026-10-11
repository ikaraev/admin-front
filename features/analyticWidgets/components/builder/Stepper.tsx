import { MinusIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** A clamped integer stepper: − value +. */
export function Stepper({ value, min, max, onChange, label, disabled = false, invalid = false }: { value: number; min: number; max: number; onChange: (value: number) => void; label: string; disabled?: boolean; invalid?: boolean }) {
  return <div role="group" aria-label={label} className="inline-flex items-center gap-1">
    <Button type="button" variant="outline" size="icon-xs" aria-label={`Decrease ${label.toLowerCase()}`} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}><MinusIcon /></Button>
    <output aria-live="polite" aria-invalid={invalid || undefined} className="w-7 text-center text-sm font-medium tabular-nums aria-invalid:text-destructive">{value}</output>
    <Button type="button" variant="outline" size="icon-xs" aria-label={`Increase ${label.toLowerCase()}`} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))}><PlusIcon /></Button>
  </div>;
}
