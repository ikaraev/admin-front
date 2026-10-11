import { CheckIcon, ChevronDownIcon, SearchIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface MultiSelectOption { value: string; label: string }

const SEARCH_FROM = 8;

/**
 * A searchable multi-select in a popover. Nothing picked shows the placeholder ("All operators");
 * several picked show a count. Picking only edits the value: the page applies it with its Apply button.
 */
export function MultiSelect({ id, label, placeholder, noun, options, value, onChange, disabled = false, invalid = false, className }: {
  id?: string; label: string; placeholder: string; noun: string; options: MultiSelectOption[]; value: string[];
  onChange: (value: string[]) => void; disabled?: boolean; invalid?: boolean; className?: string;
}) {
  const [search, setSearch] = useState('');
  const listId = useId();
  const picked = new Set(value);
  const query = search.trim().toLowerCase();
  const shown = query ? options.filter((option) => option.label.toLowerCase().includes(query)) : options;
  const summary = value.length === 0 ? placeholder
    : value.length === 1 ? options.find((option) => option.value === value[0])?.label ?? value[0]
    : `${value.length} ${noun}`;
  const toggle = (item: string) => onChange(picked.has(item) ? value.filter((current) => current !== item) : [...value, item]);

  return <Popover onOpenChange={(open) => { if (!open) setSearch(''); }}>
    <PopoverTrigger asChild>
      <Button id={id} type="button" variant="outline" disabled={disabled} aria-invalid={invalid || undefined} className={cn('w-full justify-between font-normal', value.length === 0 && 'text-muted-foreground', className)}>
        <span className="truncate">{summary}</span><ChevronDownIcon className="text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-64 gap-1 p-1">
      {options.length >= SEARCH_FROM ? <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${noun}`} aria-label={`Search ${noun}`} aria-controls={listId}
          className="h-8 w-full rounded-md bg-transparent pr-2 pl-7 text-sm outline-none placeholder:text-muted-foreground" />
      </div> : null}
      <div id={listId} role="listbox" aria-multiselectable aria-label={label} className="max-h-64 overflow-y-auto">
        {shown.map((option) => {
          const selected = picked.has(option.value);
          return <button key={option.value} type="button" role="option" aria-selected={selected} onClick={() => toggle(option.value)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted">
            <span className={cn('flex size-4 shrink-0 items-center justify-center rounded-[4px] border', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
              {selected ? <CheckIcon className="size-3" /> : null}
            </span>
            <span className="truncate">{option.label}</span>
          </button>;
        })}
        {shown.length === 0 ? <p className="px-2 py-3 text-center text-sm text-muted-foreground">No match.</p> : null}
      </div>
      {value.length ? <Button type="button" variant="ghost" size="sm" className="justify-start" onClick={() => onChange([])}>Clear selection</Button> : null}
    </PopoverContent>
  </Popover>;
}
