import { XIcon } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { isEmpty, pruneByParent, visibleOptions } from '../lib/filters';
import type { AnalyticsFilterCatalog, FilterDefinition, FilterValues } from '../types/filters';
import { MultiSelect } from './MultiSelect';

const ANY = '__any__';

/**
 * One control per filter the server offers, in its order, chosen by `kind` only. No filter is
 * shown or hidden here by role or scope: the catalogue already says what this caller may use.
 * Filters without a short list of options (`options: null`) are left out for now.
 */
export function AnalyticsFilterBar({ catalog, value, onChange, errors = {} }: { catalog: AnalyticsFilterCatalog; value: FilterValues; onChange: (value: FilterValues) => void; errors?: Record<string, string[]> }) {
  const shown = catalog.filters.filter((filter) => filter.kind === 'boolean' || filter.options !== null);
  if (shown.length === 0) return null;
  const set = (key: string, next: string[] | string | true | undefined) => {
    const values = { ...value };
    if (next === undefined || (Array.isArray(next) && next.length === 0)) delete values[key]; else values[key] = next;
    onChange(pruneByParent(values, catalog));
  };

  return <div className="flex flex-wrap items-end gap-3">
    {shown.map((filter) => <FilterControl key={filter.key} filter={filter} values={value} onSet={set} errors={errors[filter.key]} />)}
    {isEmpty(value) ? null : <Button type="button" variant="ghost" onClick={() => onChange({})}><XIcon />Clear filters</Button>}
  </div>;
}

function FilterControl({ filter, values, onSet, errors }: { filter: FilterDefinition; values: FilterValues; onSet: (key: string, value: string[] | string | true | undefined) => void; errors?: string[] }) {
  const id = useId();
  const value = values[filter.key];
  const options = visibleOptions(filter, values);
  const none = filter.options !== null && filter.options.length === 0;
  const invalid = Boolean(errors?.length);

  if (filter.kind === 'boolean') {
    return <Field orientation="horizontal" className="h-8 w-auto self-end">
      <Switch id={id} checked={value === true} onCheckedChange={(checked) => onSet(filter.key, checked ? true : undefined)} aria-invalid={invalid || undefined} />
      <FieldLabel htmlFor={id} className="font-normal whitespace-nowrap">{filter.label}</FieldLabel>
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </Field>;
  }

  return <Field className="w-44" data-invalid={invalid || undefined}>
    <FieldLabel htmlFor={id}>{filter.label}</FieldLabel>
    {filter.kind === 'multiple' ? <MultiSelect id={id} label={filter.label} placeholder={none ? 'None' : `All ${filter.label.toLowerCase()}s`} noun={`${filter.label.toLowerCase()}s`}
      options={options} value={Array.isArray(value) ? value : []} onChange={(next) => onSet(filter.key, next)} disabled={none} invalid={invalid} />
      : <Select value={typeof value === 'string' ? value : ANY} onValueChange={(next) => onSet(filter.key, next === ANY ? undefined : next)} disabled={none}>
        <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined}><SelectValue placeholder={none ? 'None' : 'Any'} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any</SelectItem>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>}
    <FieldError errors={errors?.map((message) => ({ message }))} />
  </Field>;
}
