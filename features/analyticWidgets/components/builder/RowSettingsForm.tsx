import { CopyIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmButton';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { BLOCK_WIDTH_MAX, BLOCK_WIDTH_MIN, ROW_BLOCKS_MAX, ROW_WIDTH } from '../../lib/limits';
import { deepEqual, rowWidgetCount, rowWidth, rowWidths } from '../../lib/layout';
import { SPLIT_PRESETS } from '../../lib/presets';
import type { LayoutRow } from '../../types/analyticWidgets';
import { SplitIcon } from './SplitIcon';
import { Stepper } from './Stepper';
import { useBuilderActions } from './useBuilderActions';
import { useBuilder } from './WidgetBuilderProvider';

/** The selected row: presets, a block count, a width per block, and the live total. */
export function RowSettingsForm({ row, index }: { row: LayoutRow; index: number }) {
  const { errors, locked } = useBuilder();
  const actions = useBuilderActions();
  const [confirming, setConfirming] = useState(false);
  const widths = rowWidths(row);
  const total = rowWidth(row);
  const setBlocks = (count: number) => actions.resplit(row.id, count > widths.length ? [...widths, ...Array.from({ length: count - widths.length }, () => Math.max(BLOCK_WIDTH_MIN, Math.min(BLOCK_WIDTH_MAX, ROW_WIDTH - total)) || BLOCK_WIDTH_MIN)] : widths.slice(0, count));
  const setWidth = (blockIndex: number, width: number) => actions.resplit(row.id, widths.map((current, i) => (i === blockIndex ? width : current)));

  return <fieldset disabled={locked} className="min-w-0"><FieldGroup className="gap-5">
    <h3 className="text-sm font-medium">Row {index + 1}</h3>
    <Field>
      <FieldLabel>Split</FieldLabel>
      <div className="grid grid-cols-2 gap-1.5">
        {SPLIT_PRESETS.map((preset) => {
          const active = deepEqual(preset.widths, widths);
          return <Button key={preset.key} type="button" variant={active ? 'secondary' : 'outline'} size="sm" aria-pressed={active} className="justify-start" onClick={() => actions.resplit(row.id, preset.widths)}>
            <SplitIcon widths={preset.widths} />{preset.label}
          </Button>;
        })}
      </div>
    </Field>
    <Field orientation="horizontal">
      <FieldLabel>Blocks</FieldLabel>
      <Stepper label="Blocks" value={widths.length} min={1} max={ROW_BLOCKS_MAX} onChange={setBlocks} />
    </Field>
    <Field>
      <FieldLabel>Widths, in twelfths</FieldLabel>
      <div className="flex flex-col gap-1.5">
        {widths.map((width, i) => <div key={i} className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Block {i + 1}</span>
          <Stepper label={`Block ${i + 1} width`} value={width} min={BLOCK_WIDTH_MIN} max={BLOCK_WIDTH_MAX} invalid={total > ROW_WIDTH} onChange={(value) => setWidth(i, value)} />
        </div>)}
      </div>
      <p className={cn('text-sm tabular-nums', total > ROW_WIDTH ? 'text-destructive' : total < ROW_WIDTH ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
        {widths.join(' + ')} = {total}/{ROW_WIDTH}
      </p>
      {total > ROW_WIDTH ? <FieldError>The blocks are wider than the row. Make their widths add up to {ROW_WIDTH} or less.</FieldError>
        : total < ROW_WIDTH ? <p className="text-xs text-muted-foreground">Leaves a gap of {ROW_WIDTH - total}/{ROW_WIDTH} on the right.</p> : null}
      <FieldError errors={errors.rows.get(row.id)?.map((message) => ({ message }))} />
    </Field>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => actions.duplicateRow(row.id)}><CopyIcon />Duplicate row</Button>
      <Button type="button" variant="destructive" size="sm" onClick={() => (rowWidgetCount(row) > 0 ? setConfirming(true) : actions.removeRow(row.id))}><Trash2Icon />Delete row</Button>
    </div>
    <ConfirmDialog open={confirming} onOpenChange={setConfirming} title={`Delete row ${index + 1}?`} description="Its widgets are removed from the page. Nothing is saved until you press Save."
      confirmLabel="Delete row" onConfirm={async () => actions.removeRow(row.id)} />
  </FieldGroup></fieldset>;
}
