import { useId, type ComponentProps, type ReactNode } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export type Option = { value: string; label: string };

type BaseProps<T extends FieldValues> = { control: Control<T>; name: FieldPath<T>; label: string; description?: ReactNode; className?: string };

export function TextField<T extends FieldValues>({ control, name, label, description, className, ...input }: BaseProps<T> & Omit<ComponentProps<'input'>, 'name' | 'value' | 'onChange' | 'className'>) {
  const id = useId();
  return <Controller control={control} name={name} render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input {...input} {...field} value={field.value ?? ''} id={id} aria-invalid={fieldState.invalid} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={[fieldState.error]} />
    </Field>
  )} />;
}

export function TextareaField<T extends FieldValues>({ control, name, label, description, className, ...textarea }: BaseProps<T> & Omit<ComponentProps<'textarea'>, 'name' | 'value' | 'onChange' | 'className'>) {
  const id = useId();
  return <Controller control={control} name={name} render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea {...textarea} {...field} value={field.value ?? ''} id={id} aria-invalid={fieldState.invalid} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={[fieldState.error]} />
    </Field>
  )} />;
}

/** Stores a number, or undefined while the input is empty. */
export function NumberField<T extends FieldValues>({ control, name, label, description, className, ...input }: BaseProps<T> & Omit<ComponentProps<'input'>, 'name' | 'value' | 'onChange' | 'type' | 'className'>) {
  const id = useId();
  return <Controller control={control} name={name} render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input {...input} {...field} type="number" inputMode="decimal" id={id} aria-invalid={fieldState.invalid} value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={[fieldState.error]} />
    </Field>
  )} />;
}

const NONE = '__none__';

export function SelectField<T extends FieldValues>({ control, name, label, description, className, options, placeholder = 'Select…', clearable = false, disabled }: BaseProps<T> & { options: Option[]; placeholder?: string; clearable?: boolean; disabled?: boolean }) {
  const id = useId();
  return <Controller control={control} name={name} render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={field.value ?? ''} onValueChange={(value) => field.onChange(value === NONE ? null : value)} disabled={disabled}>
        <SelectTrigger id={id} onBlur={field.onBlur} aria-invalid={fieldState.invalid} className="w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {clearable ? <SelectItem value={NONE}>Not set</SelectItem> : null}
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={[fieldState.error]} />
    </Field>
  )} />;
}

export function SwitchField<T extends FieldValues>({ control, name, label, description, className, disabled }: BaseProps<T> & { disabled?: boolean }) {
  const id = useId();
  return <Controller control={control} name={name} render={({ field }) => (
    <Field orientation="horizontal" className={className}>
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </FieldContent>
      <Switch id={id} checked={Boolean(field.value)} onCheckedChange={field.onChange} onBlur={field.onBlur} disabled={disabled} />
    </Field>
  )} />;
}

/** Multi-select as a checkbox list; the value is an array of option values. */
export function CheckboxGroupField<T extends FieldValues>({ control, name, label, description, className, options, disabled }: BaseProps<T> & { options: Option[]; disabled?: boolean }) {
  const id = useId();
  return <Controller control={control} name={name} render={({ field, fieldState }) => {
    const selected = new Set<string>(field.value ?? []);
    const toggle = (value: string, checked: boolean) => { const next = new Set(selected); if (checked) next.add(value); else next.delete(value); field.onChange([...next]); };
    return <FieldSet data-invalid={fieldState.invalid} className={className ?? 'gap-2'}>
      <FieldLegend variant="label">{label}</FieldLegend>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <div className="flex max-h-72 flex-col gap-2.5 overflow-y-auto rounded-lg border p-3">
        {options.length === 0 ? <p className="text-sm text-muted-foreground">No options available.</p> : options.map((option) => (
          <Field key={option.value} orientation="horizontal">
            <Checkbox id={`${id}-${option.value}`} checked={selected.has(option.value)} onCheckedChange={(checked) => toggle(option.value, checked === true)} disabled={disabled} />
            <FieldLabel htmlFor={`${id}-${option.value}`} className="font-normal">{option.label}</FieldLabel>
          </Field>
        ))}
      </div>
      <FieldError errors={[fieldState.error]} />
    </FieldSet>;
  }} />;
}
