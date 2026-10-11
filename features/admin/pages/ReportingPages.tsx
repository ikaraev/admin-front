import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SubmitButton } from '@/components/common/SubmitButton';
import { ErrorState, LoadingState } from '@/components/feedback/QueryState';
import { CheckboxGroupField, NumberField, SelectField, SwitchField, TextareaField, TextField, type Option } from '@/components/forms/FormFields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field';
import { optionalNumber, optionalText, requiredNumber, requiredText, splitList, useZodForm } from '@/lib/forms';
import { useSearchParams } from 'react-router';
import { apiErrorMessage } from '../../../api/client';
import { AnalyticsFilterBar } from '../../analytics/components/AnalyticsFilterBar';
import { MultiSelect } from '../../analytics/components/MultiSelect';
import { useAnalyticsFilters, useClearRefusedFilters } from '../../analytics/hooks/useAnalyticsFilters';
import { filterFieldErrors, omitKeys, readFromSearch, sanitizeFilters, toQueryParams, writeToSearch } from '../../analytics/lib/filters';
import type { AnalyticsFilterCatalog, FilterValues } from '../../analytics/types/filters';
import { action, adminApi, create, list, read, update, type AnalyticsSummary, type AuditEntry, type Game } from '../api/adminApi';
import { AdminPage, FormSheet, SectionHeading, ServerTable, type Column } from '../components/AdminPage';
import { CurrencyMetricsTable } from '../components/CurrencyMetricsTable';
import { useCurrencyIndex } from '../hooks/useCurrencies';
import { useAdminScope } from '../hooks/useScope';

const showError = (error: unknown) => toast.error(apiErrorMessage(error));
const toOptions = (values: string[]): Option[] => values.map((value) => ({ value, label: value.replace(/_/g, ' ') }));
const DEVICE_OPTIONS = toOptions(['desktop', 'mobile', 'tablet']);
const CATEGORY_OPTIONS = [{ value: 'slots', label: 'Slots' }, { value: 'instant', label: 'Instant' }];

export function GamesPage() {
  const { scopePath, isPlatform, me } = useAdminScope(); const client = useQueryClient(); const [page, setPage] = useState(1); const [selected, setSelected] = useState<Game>(); const [creating, setCreating] = useState(false);
  const path = `${scopePath}/games`; const query = useQuery({ queryKey: ['games', path, page], queryFn: () => list<Game>(path, { page }), enabled: Boolean(me.data) });
  const refresh = () => client.invalidateQueries({ queryKey: ['games', path] });
  const save = useMutation({ mutationFn: ({ uuid, suffix, body }: { uuid: string; suffix: string; body: Record<string, unknown> }) => update<Game>(`/platform/games/${uuid}${suffix}`, body), onSuccess: (game) => { setSelected(game); refresh(); toast.success('Game configuration saved.'); }, onError: showError });
  const createGame = useMutation({ mutationFn: (body: Record<string, unknown>) => create<Game>('/platform/games', body), onSuccess: (game) => { refresh(); setCreating(false); setSelected(game); toast.success('Game created as a draft. Configure its limits before activating it.'); }, onError: showError });
  const status = useMutation({ mutationFn: ({ uuid, value, comment }: { uuid: string; value: string; comment: string }) => action<Game>(`/platform/games/${uuid}/status`, { status: value, comment }), onSuccess: (game) => { setSelected(game); refresh(); toast.success('Game status updated.'); }, onError: showError });
  const columns: Column<Game>[] = [{ key: 'title', title: 'Title', cellClassName: 'font-medium' }, { key: 'identifier', title: 'Identifier', cellClassName: 'font-mono text-xs' }, { key: 'category', title: 'Category' }, { key: 'genre', title: 'Genre' }, { key: 'status', title: 'Status', render: (row) => <StatusBadge tone={row.status === 'active' ? 'success' : row.status === 'disabled' ? 'danger' : 'neutral'}>{row.status}</StatusBadge> }, { key: 'actions', title: '', className: 'text-right', render: (row) => <Button variant="ghost" size="sm" onClick={() => setSelected(row)}>{isPlatform ? 'Configure' : 'View'}</Button> }];
  return <AdminPage actions={isPlatform ? <Button onClick={() => setCreating(true)}>Create game</Button> : undefined}>
    <ServerTable page={query.data} loading={query.isLoading} error={query.error} columns={columns} onChange={setPage} />
    <FormSheet wide open={Boolean(selected)} onClose={() => setSelected(undefined)} title={selected?.title ?? 'Game'}>
      {selected ? <GameDetails key={`${selected.uuid}-${selected.version}`} game={selected} canManage={isPlatform} pending={save.isPending || status.isPending} saveStatus={(value, comment) => status.mutate({ uuid: selected.uuid, value, comment })} saveConfiguration={(suffix, body) => save.mutate({ uuid: selected.uuid, suffix, body })} /> : null}
    </FormSheet>
    <FormSheet wide open={creating} onClose={() => setCreating(false)} title="Create game">
      <CreateGameForm submitting={createGame.isPending} onSubmit={(body) => createGame.mutate(body)} />
    </FormSheet>
  </AdminPage>;
}

const positiveInteger = optionalNumber.refine((value) => value === undefined || (Number.isInteger(value) && value >= 1), 'Use a whole number of at least 1.');
const newGameSchema = z.object({
  identifier: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{1,62}[A-Za-z0-9]$/, 'Use 3–64 letters, digits, hyphens, or underscores.'),
  genre: requiredText(), title: requiredText(), category: requiredText(),
  devices: z.array(z.string()).min(1, 'Choose at least one device.'),
  rtp_theoretical: optionalNumber.refine((value) => value === undefined || (value > 0 && value <= 100), 'Use a value above 0 and up to 100.'),
  volatility: optionalText, max_win_multiplier: positiveInteger, paylines: positiveInteger, release_date: optionalText, description: optionalText,
  tags: z.string().transform(splitList), api_freespins: z.boolean(), in_game_freespins: z.boolean(), has_buy_bonus: z.boolean(),
});

function CreateGameForm({ submitting, onSubmit }: { submitting: boolean; onSubmit: (body: Record<string, unknown>) => void }) {
  const form = useZodForm(newGameSchema, { identifier: '', genre: 'slot', title: '', category: 'slots', devices: ['desktop', 'mobile'], tags: '', api_freespins: false, in_game_freespins: false, has_buy_bonus: false });
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)}><FieldGroup>
    <TextField control={form.control} name="identifier" label="Identifier" />
    <SelectField control={form.control} name="genre" label="Game engine genre" options={[{ value: 'slot', label: 'Slot' }, { value: 'instant_win', label: 'Instant win' }]} />
    <TextField control={form.control} name="title" label="Title" />
    <SelectField control={form.control} name="category" label="Catalog category" options={CATEGORY_OPTIONS} />
    <CheckboxGroupField control={form.control} name="devices" label="Supported devices" options={DEVICE_OPTIONS} />
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberField control={form.control} name="rtp_theoretical" label="Theoretical RTP" min={0} max={100} step={0.001} />
      <SelectField control={form.control} name="volatility" label="Volatility" clearable placeholder="Not set" options={toOptions(['low', 'medium', 'high', 'very_high'])} />
      <NumberField control={form.control} name="max_win_multiplier" label="Maximum win multiplier" min={1} />
      <NumberField control={form.control} name="paylines" label="Paylines" min={1} />
    </div>
    <TextField control={form.control} name="release_date" label="Release date" type="date" />
    <TextareaField control={form.control} name="description" label="Description" rows={3} />
    <TextField control={form.control} name="tags" label="Tags (comma-separated)" />
    <SwitchField control={form.control} name="api_freespins" label="API freespins" />
    <SwitchField control={form.control} name="in_game_freespins" label="In-game freespins" />
    <SwitchField control={form.control} name="has_buy_bonus" label="Buy bonus" />
    <SubmitButton pending={submitting}>Create draft game</SubmitButton>
  </FieldGroup></form>;
}

type GameDetailsProps = { game: Game; canManage: boolean; pending: boolean; saveStatus: (status: string, comment: string) => void; saveConfiguration: (suffix: string, body: Record<string, unknown>) => void };

function GameDetails({ game, canManage, pending, saveStatus, saveConfiguration }: GameDetailsProps) {
  return <div className="flex flex-col gap-6">
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
      <dt className="text-muted-foreground">Identifier</dt><dd className="font-mono text-xs">{game.identifier}</dd>
      <dt className="text-muted-foreground">Genre</dt><dd>{game.genre}</dd>
      <dt className="text-muted-foreground">Supported currencies</dt><dd>{game.currencies.map((currency) => String(currency.currency)).join(', ') || 'None'}</dd>
    </dl>
    {canManage ? <>
      <FieldSeparator />
      <StatusForm game={game} pending={pending} onSave={saveStatus} />
      <FieldSeparator />
      <MetadataForm game={game} pending={pending} onSave={(body) => saveConfiguration('', { version: game.version, ...body })} />
      <FieldSeparator />
      <CurrencyLimitsForm initial={game.currencies} pending={pending} onSave={(currencies) => saveConfiguration('/currencies', { version: game.version, currencies })} />
      <FieldSeparator />
      <BetLevelsForm initial={game.bet_levels} pending={pending} onSave={(bet_levels) => saveConfiguration('/bet-levels', { version: game.version, bet_levels })} />
      <FieldSeparator />
      <WinThresholdsForm initial={game.win_thresholds} pending={pending} onSave={(win_thresholds) => saveConfiguration('/win-thresholds', { version: game.version, win_thresholds })} />
    </> : null}
  </div>;
}

const statusSchema = z.object({ status: requiredText(), comment: z.string().trim().min(3, 'Enter at least 3 characters.') });
function StatusForm({ game, pending, onSave }: { game: Game; pending: boolean; onSave: (status: string, comment: string) => void }) {
  const form = useZodForm(statusSchema, { status: game.status, comment: '' });
  return <form noValidate onSubmit={form.handleSubmit(({ status, comment }) => onSave(status, comment))}><FieldGroup>
    <SectionHeading title="Status" />
    <SelectField control={form.control} name="status" label="Status" options={toOptions(['draft', 'active', 'disabled', 'retired'])} />
    <TextareaField control={form.control} name="comment" label="Audit comment" />
    <SubmitButton pending={pending} className="self-start">Update status</SubmitButton>
  </FieldGroup></form>;
}

const metadataSchema = z.object({ title: requiredText(), category: requiredText(), devices: z.array(z.string()).min(1, 'Choose at least one device.'), api_freespins: z.boolean(), in_game_freespins: z.boolean(), has_buy_bonus: z.boolean() });
function MetadataForm({ game, pending, onSave }: { game: Game; pending: boolean; onSave: (body: z.output<typeof metadataSchema>) => void }) {
  const devices = Array.isArray(game.devices) ? game.devices.map(String) : [];
  const deviceOptions = [...DEVICE_OPTIONS, ...toOptions(devices.filter((device) => !DEVICE_OPTIONS.some((option) => option.value === device)))];
  const form = useZodForm(metadataSchema, { title: game.title, category: game.category, devices, api_freespins: Boolean(game.api_freespins), in_game_freespins: Boolean(game.in_game_freespins), has_buy_bonus: Boolean(game.has_buy_bonus) });
  return <form noValidate onSubmit={form.handleSubmit(onSave)}><FieldGroup>
    <SectionHeading title="Catalog metadata" />
    <TextField control={form.control} name="title" label="Title" />
    <SelectField control={form.control} name="category" label="Category" options={CATEGORY_OPTIONS.some((option) => option.value === game.category) ? CATEGORY_OPTIONS : [...CATEGORY_OPTIONS, { value: game.category, label: game.category }]} />
    <CheckboxGroupField control={form.control} name="devices" label="Devices" options={deviceOptions} />
    <SwitchField control={form.control} name="api_freespins" label="API freespins" />
    <SwitchField control={form.control} name="in_game_freespins" label="In-game freespins" />
    <SwitchField control={form.control} name="has_buy_bonus" label="Buy bonus" />
    <SubmitButton variant="outline" pending={pending} className="self-start">Save metadata</SubmitButton>
  </FieldGroup></form>;
}

const atLeastOne = () => requiredNumber(undefined, z.number().min(1, 'Must be at least 1.'));
const currencyLimitsSchema = z.object({ currencies: z.array(z.object({ currency: requiredText(), bet_min: atLeastOne(), bet_max: atLeastOne(), bet_default: atLeastOne(), bet_step: optionalNumber.refine((value) => value === undefined || value >= 0, 'Cannot be negative.') })) });
type CurrencyLimit = z.output<typeof currencyLimitsSchema>['currencies'][number];

function CurrencyLimitsForm({ initial, pending, onSave }: { initial: unknown; pending: boolean; onSave: (currencies: CurrencyLimit[]) => void }) {
  const currencies = useQuery({ queryKey: ['active-currencies'], queryFn: () => adminApi.currencies(true) });
  const form = useZodForm(currencyLimitsSchema, { currencies: (initial as CurrencyLimit[] | null) ?? [] });
  const rows = useFieldArray({ control: form.control, name: 'currencies' });
  const options = (currencies.data ?? []).map((currency) => ({ value: currency.code, label: currency.code }));
  return <form noValidate onSubmit={form.handleSubmit((values) => onSave(values.currencies))}><FieldGroup>
    <SectionHeading title="Currencies and bet limits" description="Amounts use each currency’s minor units. Add one row for every supported currency." />
    {rows.fields.map((row, index) => <RowCard key={row.id} onRemove={() => rows.remove(index)}>
      <SelectField control={form.control} name={`currencies.${index}.currency`} label="Currency" options={options} />
      <NumberField control={form.control} name={`currencies.${index}.bet_min`} label="Min bet" min={1} />
      <NumberField control={form.control} name={`currencies.${index}.bet_max`} label="Max bet" min={1} />
      <NumberField control={form.control} name={`currencies.${index}.bet_default`} label="Default bet" min={1} />
      <NumberField control={form.control} name={`currencies.${index}.bet_step`} label="Step" min={0} />
    </RowCard>)}
    <RowListActions addLabel="Add currency limit" onAdd={() => rows.append({ currency: '', bet_min: undefined, bet_max: undefined, bet_default: undefined, bet_step: 0 })} submitLabel="Save currency limits" pending={pending} />
  </FieldGroup></form>;
}

const betLevelsSchema = z.object({ bet_levels: z.array(z.object({ level: atLeastOne(), bet_amount: atLeastOne() })) });
type BetLevel = z.output<typeof betLevelsSchema>['bet_levels'][number];

function BetLevelsForm({ initial, pending, onSave }: { initial: unknown; pending: boolean; onSave: (levels: BetLevel[]) => void }) {
  const form = useZodForm(betLevelsSchema, { bet_levels: (initial as BetLevel[] | null) ?? [] });
  const rows = useFieldArray({ control: form.control, name: 'bet_levels' });
  return <form noValidate onSubmit={form.handleSubmit((values) => onSave(values.bet_levels))}><FieldGroup>
    <SectionHeading title="Bet levels" description="Levels must be consecutive and each stake must be larger than the preceding one." />
    {rows.fields.map((row, index) => <RowCard key={row.id} onRemove={() => rows.remove(index)}>
      <NumberField control={form.control} name={`bet_levels.${index}.level`} label="Level" min={1} />
      <NumberField control={form.control} name={`bet_levels.${index}.bet_amount`} label="Bet amount" min={1} />
    </RowCard>)}
    <RowListActions addLabel="Add bet level" onAdd={() => rows.append({ level: rows.fields.length + 1, bet_amount: undefined })} submitLabel="Save bet levels" pending={pending} />
  </FieldGroup></form>;
}

const winThresholdsSchema = z.object({ win_thresholds: z.array(z.object({ code: z.string().trim().regex(/^[a-z][a-z0-9_]{1,31}$/, 'Use 2–32 lowercase letters, digits or underscores, starting with a letter.'), multiplier: requiredNumber(undefined, z.number().min(0.01, 'Must be at least 0.01.')) })) });
type WinThreshold = z.output<typeof winThresholdsSchema>['win_thresholds'][number];

function WinThresholdsForm({ initial, pending, onSave }: { initial: unknown; pending: boolean; onSave: (thresholds: WinThreshold[]) => void }) {
  const form = useZodForm(winThresholdsSchema, { win_thresholds: (initial as WinThreshold[] | null) ?? [] });
  const rows = useFieldArray({ control: form.control, name: 'win_thresholds' });
  return <form noValidate onSubmit={form.handleSubmit((values) => onSave(values.win_thresholds))}><FieldGroup>
    <SectionHeading title="Win thresholds" description="Use a short lowercase code and the win multiplier at which it applies." />
    {rows.fields.map((row, index) => <RowCard key={row.id} onRemove={() => rows.remove(index)}>
      <TextField control={form.control} name={`win_thresholds.${index}.code`} label="Code" placeholder="e.g. major_win" />
      <NumberField control={form.control} name={`win_thresholds.${index}.multiplier`} label="Multiplier" min={0.01} step={0.01} />
    </RowCard>)}
    <RowListActions addLabel="Add win threshold" onAdd={() => rows.append({ code: '', multiplier: undefined })} submitLabel="Save win thresholds" pending={pending} />
  </FieldGroup></form>;
}

function RowCard({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
    <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]">{children}</div>
    <Button type="button" variant="ghost" size="icon-sm" className="mt-6 text-muted-foreground hover:text-destructive" aria-label="Remove row" onClick={onRemove}><Trash2Icon /></Button>
  </div>;
}

function RowListActions({ addLabel, onAdd, submitLabel, pending }: { addLabel: string; onAdd: () => void; submitLabel: string; pending: boolean }) {
  return <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={onAdd}><PlusIcon />{addLabel}</Button><SubmitButton pending={pending}>{submitLabel}</SubmitButton></div>;
}

function lastSevenDays() { const today = new Date(); const to = today.toISOString().slice(0, 10); const from = new Date(today.getTime() - 6 * 86_400_000).toISOString().slice(0, 10); return { from, to }; }
const dynamicColumns = (row: Record<string, unknown> | undefined): Column<Record<string, unknown>>[] => (row ? Object.keys(row).map((key) => ({ key, title: key.replace(/_/g, ' ') })) : []);
const DEFAULT_GROUP_BY = ['date'];
const sanitizeGroupBy = (groupBy: string[], catalog: AnalyticsFilterCatalog) => groupBy.filter((key) => catalog.dimensions.some((dimension) => dimension.key === key));

/** Tabular reports. Charts and KPIs live in the dashboard widgets. */
export function ReportsPage() {
  const { scopePath, me } = useAdminScope();
  const catalog = useAnalyticsFilters();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dates, setDates] = useState(lastSevenDays);
  // Null until the user applies something: the filters then come from the URL, sanitised against the catalogue.
  const [chosen, setChosen] = useState<FilterValues | null>(null);
  const [groupBy, setGroupBy] = useState<string[]>(DEFAULT_GROUP_BY);
  const [ggrPage, setGgrPage] = useState(1);
  const filters = catalog.data ? sanitizeFilters(chosen ?? readFromSearch(searchParams, catalog.data), catalog.data) : null;
  const grouping = catalog.data ? sanitizeGroupBy(groupBy, catalog.data) : [];
  const params = { from: dates.from, to: dates.to, ...toQueryParams(filters ?? {}) };
  const ready = Boolean(me.data) && filters !== null;

  const summary = useQuery({ queryKey: ['analytics-summary', scopePath, params], queryFn: () => read<AnalyticsSummary>(`${scopePath}/analytics/summary`, params), enabled: ready });
  const ggr = useQuery({ queryKey: ['ggr', scopePath, params, grouping, ggrPage], queryFn: () => list<Record<string, unknown>>(`${scopePath}/reports/ggr`, { ...params, ...(grouping.length ? { group_by: grouping } : {}), page: ggrPage }), enabled: ready });
  const currencyByCode = useCurrencyIndex();
  const summaryRows = useMemo(() => [...(summary.data?.currencies ?? [])].sort((a, b) => b.bets_amount - a.bets_amount), [summary.data]);
  const ggrColumns = useMemo(() => dynamicColumns(ggr.data?.items[0]), [ggr.data]);

  const apply = (next: { from: string; to: string; filters: FilterValues; groupBy: string[] }) => {
    setDates({ from: next.from, to: next.to }); setChosen(next.filters); setGroupBy(next.groupBy); setGgrPage(1);
    if (catalog.data) { const known = catalog.data; setSearchParams((current) => writeToSearch(current, next.filters, known), { replace: true }); }
  };
  useClearRefusedFilters([summary.error, ggr.error], (keys) => {
    if (filters) apply({ ...dates, filters: omitKeys(filters, keys), groupBy: keys.includes('group_by') ? DEFAULT_GROUP_BY : groupBy });
  });

  if (catalog.isError) return <ErrorState title="Unable to load the report filters." message={apiErrorMessage(catalog.error)} />;
  if (!catalog.data || !filters) return <LoadingState />;
  const fieldErrors = filterFieldErrors(summary.error ?? ggr.error, catalog.data);
  return <AdminPage>
    <Card><CardContent>
      <ReportFilterForm key={JSON.stringify([dates, filters, grouping])} catalog={catalog.data} applied={{ ...dates, filters, groupBy: grouping }} errors={fieldErrors}
        pending={summary.isFetching || ggr.isFetching} onApply={apply} />
    </CardContent></Card>
    {summary.isError && Object.keys(fieldErrors).length === 0 ? <ErrorState title="Unable to load the summary." message={apiErrorMessage(summary.error)} /> : <>
      <SectionHeading title="Summary by currency" description="Each currency on its own; amounts in different currencies are never added up." />
      <CurrencyMetricsTable rows={summaryRows} currencies={currencyByCode} loading={summary.isLoading} />
    </>}
    <SectionHeading title="GGR report" />
    <ServerTable page={ggr.data} loading={ggr.isLoading} error={ggr.error} columns={ggrColumns} onChange={setGgrPage} />
  </AdminPage>;
}

const reportFilterSchema = z.object({ from: requiredText('Choose a start date.'), to: requiredText('Choose an end date.') });
type AppliedReportFilters = { from: string; to: string; filters: FilterValues; groupBy: string[] };

/** Dates, filters and grouping are edited here and applied together, so a report refetches once per Apply. */
function ReportFilterForm({ catalog, applied, errors, pending, onApply }: { catalog: AnalyticsFilterCatalog; applied: AppliedReportFilters; errors: Record<string, string[]>; pending: boolean; onApply: (next: AppliedReportFilters) => void }) {
  const form = useZodForm(reportFilterSchema, { from: applied.from, to: applied.to });
  const [filters, setFilters] = useState(applied.filters);
  const [groupBy, setGroupBy] = useState(applied.groupBy);
  return <form noValidate onSubmit={form.handleSubmit((dates) => onApply({ ...dates, filters, groupBy }))} className="flex flex-col gap-4">
    <div className="flex flex-wrap items-end gap-3">
      <TextField control={form.control} name="from" label="From" type="date" className="w-auto" />
      <TextField control={form.control} name="to" label="To" type="date" className="w-auto" />
      {catalog.dimensions.length ? <Field className="w-44">
        <FieldLabel>Group GGR by</FieldLabel>
        <MultiSelect label="Group GGR by" placeholder="Date" noun="dimensions" options={catalog.dimensions.map((dimension) => ({ value: dimension.key, label: dimension.label }))} value={groupBy} onChange={setGroupBy} />
      </Field> : null}
      <SubmitButton pending={pending}>Apply</SubmitButton>
    </div>
    <AnalyticsFilterBar catalog={catalog} value={filters} onChange={setFilters} errors={errors} />
  </form>;
}

const auditFilterSchema = z.object({ action: z.string().trim(), entity_type: z.string().trim(), from: z.string(), to: z.string() });

export function AuditPage() {
  const { scopePath, me } = useAdminScope(); const [filters, setFilters] = useState({ action: '', entity_type: '', from: '', to: '' }); const [page, setPage] = useState(1);
  const form = useZodForm(auditFilterSchema, filters);
  const query = useQuery({ queryKey: ['audit', scopePath, filters, page], queryFn: () => list<AuditEntry>(`${scopePath}/audit`, { ...filters, page }), enabled: Boolean(me.data) });
  const columns: Column<AuditEntry>[] = [{ key: 'occurred_at', title: 'When', className: 'tabular-nums' }, { key: 'action', title: 'Action', cellClassName: 'font-medium' }, { key: 'actor', title: 'Actor', render: (row) => row.actor?.name ?? 'System' }, { key: 'entity', title: 'Entity', render: (row) => row.entity_type ? `${row.entity_type}: ${row.entity_id}` : '—' }, { key: 'operator_uuid', title: 'Operator', cellClassName: 'font-mono text-xs' }];
  return <AdminPage>
    <Card><CardContent>
      <form noValidate onSubmit={form.handleSubmit((values) => { setFilters(values); setPage(1); })} className="flex flex-wrap items-end gap-3">
        <TextField control={form.control} name="action" label="Action" className="w-full sm:w-44" />
        <TextField control={form.control} name="entity_type" label="Entity" className="w-full sm:w-44" />
        <TextField control={form.control} name="from" label="From" type="date" className="w-auto" />
        <TextField control={form.control} name="to" label="To" type="date" className="w-auto" />
        <SubmitButton pending={query.isFetching}>Filter</SubmitButton>
      </form>
    </CardContent></Card>
    <ServerTable page={query.data} loading={query.isLoading} error={query.error} columns={columns} onChange={setPage} />
  </AdminPage>;
}
