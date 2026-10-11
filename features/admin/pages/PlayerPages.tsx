import { keepPreviousData, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowDownIcon, ArrowLeftIcon, ArrowUpDownIcon, ArrowUpIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import { CopyableText } from '@/components/common/CopyableText';
import { SubmitButton } from '@/components/common/SubmitButton';
import { ErrorState, InlineError, LoadingState } from '@/components/feedback/QueryState';
import { TextField } from '@/components/forms/FormFields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useZodForm } from '@/lib/forms';
import type { ApiFailure } from '../../../api/types';
import { apiErrorMessage } from '../../../api/client';
import { list, read, type Brand, type JsonObject, type Operator, type Player } from '../api/adminApi';
import { AdminPage, ServerTable, type Column } from '../components/AdminPage';
import { useAdminScope } from '../hooks/useScope';

/*
 * Players are read-only: the provider creates them on a first real launch and the panel only
 * lists them. The server decides whose players a caller sees; the URL holds the list state
 * under the API's own parameter names, so a filtered list can be shared and Back works.
 */

const FILTER_KEYS = ['operator_uuid', 'brand_uuid', 'country', 'currency', 'gender', 'search', 'from', 'to'] as const;
type FilterKey = typeof FILTER_KEYS[number];
type PlayerFilters = Record<FilterKey, string>;
type Sort = 'registered_at' | 'external_id';
type Direction = 'asc' | 'desc';
interface ListState { filters: PlayerFilters; sort: Sort; direction: Direction; page: number }

const NO_FILTERS: PlayerFilters = { operator_uuid: '', brand_uuid: '', country: '', currency: '', gender: '', search: '', from: '', to: '' };
const GENDERS: Record<string, string> = { m: 'Male', f: 'Female' };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** The server's defaults: newest first. */
const DEFAULT_SORT: Sort = 'registered_at';
const DEFAULT_DIRECTION: Direction = 'desc';
/** The first click on a column sorts names A→Z and dates newest first. */
const FIRST_DIRECTION: Record<Sort, Direction> = { registered_at: 'desc', external_id: 'asc' };
const ALL = '__all__';

/** Reads the list state from the URL, dropping what this scope can't send. */
function readState(params: URLSearchParams, isPlatform: boolean): ListState {
  const get = (key: string) => params.get(key)?.trim() ?? '';
  const operator = isPlatform ? get('operator_uuid') : '';
  const date = (key: string) => (DATE.test(get(key)) ? get(key) : '');
  const sort = get('sort'); const direction = get('direction'); const page = Number(get('page')); const gender = get('gender');
  return {
    filters: {
      operator_uuid: operator,
      // The platform narrows to a brand only inside one operator.
      brand_uuid: isPlatform && !operator ? '' : get('brand_uuid'),
      country: get('country').toUpperCase(), currency: get('currency').toUpperCase(), gender: gender in GENDERS ? gender : '',
      search: get('search'), from: date('from'), to: date('to'),
    },
    sort: sort === 'external_id' || sort === 'registered_at' ? sort : DEFAULT_SORT,
    direction: direction === 'asc' || direction === 'desc' ? direction : DEFAULT_DIRECTION,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

function writeState(state: ListState): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) if (state.filters[key]) params.set(key, state.filters[key]);
  if (state.sort !== DEFAULT_SORT) params.set('sort', state.sort);
  if (state.direction !== DEFAULT_DIRECTION) params.set('direction', state.direction);
  if (state.page > 1) params.set('page', String(state.page));
  return params;
}

/**
 * The dates are days in the user's time zone, sent as the instants that bound them: a bare
 * `to=2026-10-10` would be compared as midnight and leave that day's players out.
 */
const dayStart = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d).toISOString(); };
const dayEnd = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString().replace(/\.999Z$/, '.999999Z'); };

function requestParams({ filters, sort, direction, page }: ListState): JsonObject {
  const params: JsonObject = { sort, direction, page };
  for (const key of FILTER_KEYS) if (filters[key]) params[key] = filters[key];
  if (filters.from) params.from = dayStart(filters.from);
  if (filters.to) params.to = dayEnd(filters.to);
  return params;
}

const hasFilters = (filters: PlayerFilters) => FILTER_KEYS.some((key) => filters[key] !== '');

const status = (error: unknown) => (axios.isAxiosError(error) ? error.response?.status : undefined);
/** A request the server refused for what it asked (4xx) won't succeed the second time. */
const retryServerErrors = (count: number, error: unknown) => count < 1 && (status(error) ?? 500) >= 500;

function validationErrors(error: unknown): Record<string, string[]> | null {
  if (!axios.isAxiosError<ApiFailure>(error) || error.response?.status !== 422) return null;
  return error.response.data?.details ?? {};
}

const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const fullTimeFormat = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
function Time({ value, format = timeFormat }: { value: string; format?: Intl.DateTimeFormat }) {
  const date = new Date(value);
  return <time dateTime={value} title={value} className="tabular-nums">{Number.isNaN(date.getTime()) ? value : format.format(date)}</time>;
}

/** Operator names for the platform; the same endpoint and permission as the platform list. */
function useOperatorNames(enabled: boolean) {
  const operators = useQuery({ queryKey: ['operators-for-players'], queryFn: () => list<Operator>('/platform/operators', { per_page: 100 }), enabled, staleTime: 5 * 60_000 });
  const names = useMemo(() => new Map((operators.data?.items ?? []).map((operator) => [operator.uuid, operator.name])), [operators.data]);
  return { operators: operators.data?.items ?? [], names };
}

const brandLabel = (player: Player) => player.brand_name ?? player.brand_uuid;

export function PlayersPage() {
  const { scopePath, me, isPlatform } = useAdminScope(); const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = readState(searchParams, isPlatform);
  const params = requestParams(state);
  const { operators, names } = useOperatorNames(isPlatform);
  const query = useQuery({ queryKey: ['players', scopePath, params], queryFn: () => list<Player>(`${scopePath}/players`, params), enabled: Boolean(me.data), placeholderData: keepPreviousData, retry: retryServerErrors });
  const invalid = validationErrors(query.error);
  const fieldErrors = useMemo(() => Object.fromEntries(Object.entries(invalid ?? {}).filter(([key]) => (FILTER_KEYS as readonly string[]).includes(key))), [invalid]);

  const go = (next: ListState) => setSearchParams(writeState(next));
  const apply = (filters: PlayerFilters) => go({ ...state, filters, page: 1 });
  const sortBy = (sort: Sort) => go({ ...state, sort, direction: state.sort === sort ? (state.direction === 'asc' ? 'desc' : 'asc') : FIRST_DIRECTION[sort], page: 1 });
  const header = (sort: Sort, label: string) => <SortHeader label={label} active={state.sort === sort} direction={state.direction} onSort={() => sortBy(sort)} />;

  const columns: Column<Player>[] = [
    { key: 'external_id', title: header('external_id', 'External ID'), render: (row) => <Link to={`/admin/players/${row.uuid}`} state={{ listSearch: location.search }} className="font-mono text-xs font-medium underline-offset-4 hover:underline">{row.external_id}</Link> },
    ...(isPlatform ? [{ key: 'operator', title: 'Operator', render: (row: Player) => names.get(row.operator_uuid) ?? <span className="font-mono text-xs">{row.operator_uuid}</span> }] : []),
    { key: 'brand', title: 'Brand', render: brandLabel },
    { key: 'nickname', title: 'Nickname' },
    { key: 'email', title: 'Email' },
    { key: 'country', title: 'Country' },
    { key: 'first_currency', title: 'Currency' },
    { key: 'first_game', title: 'First game', cellClassName: 'font-mono text-xs' },
    { key: 'registered_at', title: header('registered_at', 'First seen'), render: (row) => <Time value={row.registered_at} /> },
    ...(isPlatform ? [{ key: 'provider_instance', title: 'Installation', cellClassName: 'font-mono text-xs' }] : []),
  ];
  const filtered = hasFilters(state.filters);

  return <AdminPage>
    <Card><CardContent>
      <PlayerFilterForm key={JSON.stringify(state.filters)} applied={state.filters} isPlatform={isPlatform} scopePath={scopePath} operators={operators} serverErrors={fieldErrors} pending={query.isFetching} onApply={apply} />
    </CardContent></Card>
    {invalid ? <InlineError message={Object.keys(fieldErrors).length ? 'Some filters are not valid. Correct them and apply again.' : apiErrorMessage(query.error)} />
      : <ServerTable page={query.data} loading={query.isLoading} fetching={query.isPlaceholderData} error={query.error} columns={columns} onChange={(page) => go({ ...state, page })}
        emptyText={filtered ? 'No players match these filters.' : 'No players yet.'}
        emptyDescription={filtered ? 'Change or clear the filters to see more players.' : 'A player appears here after their first real game launch.'} />}
  </AdminPage>;
}

function SortHeader({ label, active, direction, onSort }: { label: string; active: boolean; direction: Direction; onSort: () => void }) {
  const Icon = !active ? ArrowUpDownIcon : direction === 'asc' ? ArrowUpIcon : ArrowDownIcon;
  return <Button type="button" variant="ghost" size="sm" className="-ml-2 h-7 px-2" onClick={onSort}>
    {label}<Icon className={active ? undefined : 'text-muted-foreground'} aria-hidden />
    <span className="sr-only">{active ? `, sorted ${direction === 'asc' ? 'ascending' : 'descending'}` : ', sort'}</span>
  </Button>;
}

const filterSchema = z.object({
  operator_uuid: z.string(), brand_uuid: z.string(),
  country: z.string().trim().refine((value) => value === '' || /^[a-z]{2}$/i.test(value), 'Use a two-letter code, e.g. DE.').transform((value) => value.toUpperCase()),
  currency: z.string().trim().refine((value) => /^[a-z0-9]{0,8}$/i.test(value), 'Use a currency code, e.g. EUR.').transform((value) => value.toUpperCase()),
  gender: z.string(),
  search: z.string().trim().max(255, 'Use at most 255 characters.'),
  from: z.string(), to: z.string(),
}).refine((values) => !values.from || !values.to || values.to >= values.from, { path: ['to'], message: 'Must be on or after From.' });

function PlayerFilterForm({ applied, isPlatform, scopePath, operators, serverErrors, pending, onApply }: {
  applied: PlayerFilters; isPlatform: boolean; scopePath: string; operators: Operator[]; serverErrors: Record<string, string[]>; pending: boolean; onApply: (filters: PlayerFilters) => void;
}) {
  const form = useZodForm(filterSchema, applied);
  useEffect(() => {
    for (const [key, messages] of Object.entries(serverErrors)) form.setError(key as FilterKey, { type: 'server', message: messages[0] });
  }, [form, serverErrors]);
  const operator = useWatch({ control: form.control, name: 'operator_uuid' });
  // Brand options need `brands.view` in that operator, which some platform roles lack: the filter then just isn't offered.
  const brandScope = isPlatform ? (operator ? `/operators/${operator}` : null) : scopePath;
  const brands = useQuery({ queryKey: ['brands-for-players', brandScope], queryFn: () => list<Brand>(`${brandScope}/brands`, { per_page: 100 }), enabled: brandScope !== null, retry: false, staleTime: 60_000 });
  const showBrand = brandScope !== null && !brands.isError;

  return <form noValidate onSubmit={form.handleSubmit(onApply)} className="flex flex-wrap items-end gap-3">
    {isPlatform ? <Controller control={form.control} name="operator_uuid" render={({ field }) => (
      <Field className="w-full sm:w-56">
        <FieldLabel htmlFor="players-operator">Operator</FieldLabel>
        <Select value={field.value || ALL} onValueChange={(value) => { field.onChange(value === ALL ? '' : value); form.setValue('brand_uuid', ''); }}>
          <SelectTrigger id="players-operator" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All operators</SelectItem>
            {operators.map((item) => <SelectItem key={item.uuid} value={item.uuid}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    )} /> : null}
    {showBrand ? <Controller control={form.control} name="brand_uuid" render={({ field, fieldState }) => (
      <Field className="w-full sm:w-48" data-invalid={fieldState.invalid}>
        <FieldLabel htmlFor="players-brand">Brand</FieldLabel>
        <Select value={field.value || ALL} onValueChange={(value) => field.onChange(value === ALL ? '' : value)} disabled={brands.isPending}>
          <SelectTrigger id="players-brand" className="w-full" aria-invalid={fieldState.invalid}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All brands</SelectItem>
            {(brands.data?.items ?? []).map((brand) => <SelectItem key={brand.uuid} value={brand.uuid}>{brand.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    )} /> : null}
    <TextField control={form.control} name="country" label="Country" placeholder="DE" maxLength={2} autoComplete="off" className="w-24" />
    <TextField control={form.control} name="currency" label="Currency" placeholder="EUR" maxLength={8} autoComplete="off" className="w-24" />
    <Controller control={form.control} name="gender" render={({ field, fieldState }) => (
      <Field className="w-28" data-invalid={fieldState.invalid}>
        <FieldLabel htmlFor="players-gender">Gender</FieldLabel>
        <Select value={field.value || ALL} onValueChange={(value) => field.onChange(value === ALL ? '' : value)}>
          <SelectTrigger id="players-gender" className="w-full" aria-invalid={fieldState.invalid}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any</SelectItem>
            {Object.entries(GENDERS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    )} />
    <TextField control={form.control} name="search" label="Search" placeholder="ID, nickname or email" type="search" autoComplete="off" className="w-full sm:w-56" />
    <TextField control={form.control} name="from" label="First seen from" type="date" className="w-auto" />
    <TextField control={form.control} name="to" label="To" type="date" className="w-auto" />
    <SubmitButton pending={pending}>Apply</SubmitButton>
    {hasFilters(applied) ? <Button type="button" variant="ghost" onClick={() => onApply(NO_FILTERS)}><XIcon />Clear filters</Button> : null}
  </form>;
}

export function PlayerPage() {
  const { playerUuid = '' } = useParams(); const { scopePath, me, isPlatform } = useAdminScope(); const location = useLocation();
  const listSearch = (location.state as { listSearch?: unknown } | null)?.listSearch;
  const back = <Button variant="ghost" size="sm" className="-ml-2 self-start" asChild>
    <Link to={`/admin/players${typeof listSearch === 'string' ? listSearch : ''}`}><ArrowLeftIcon />Back to players</Link>
  </Button>;
  const query = useQuery({ queryKey: ['player', scopePath, playerUuid], queryFn: () => read<Player>(`${scopePath}/players/${playerUuid}`), enabled: Boolean(me.data && playerUuid), retry: retryServerErrors });
  const { names } = useOperatorNames(isPlatform);

  if (query.isPending) return <AdminPage>{back}<LoadingState /></AdminPage>;
  // Missing, another operator's, or outside the user's brands: the server answers all three alike, and so does the page.
  if (query.isError) return <AdminPage>{back}{status(query.error) === 404 ? <ErrorState title="Player not found." message="Check the link, or go back to the list." /> : <ErrorState message={apiErrorMessage(query.error)} />}</AdminPage>;
  const player = query.data;
  const empty = (value: string | null) => value ?? '—';
  const mono = (value: string | null) => (value === null ? '—' : <span className="font-mono text-xs">{value}</span>);
  const details: Row[] = [
    ['External ID', <span className="font-mono">{player.external_id}</span>],
    ['Brand', brandLabel(player)],
    ...(isPlatform ? [['Operator', names.get(player.operator_uuid) ?? mono(player.operator_uuid)] as Row] : []),
    ['Country', empty(player.country)],
    ['Nickname', empty(player.nickname)],
    ['Email', empty(player.email)],
    ['Gender', player.gender === null ? '—' : GENDERS[player.gender] ?? player.gender],
    ['City', empty(player.city)],
    ['First seen', <Time value={player.registered_at} format={fullTimeFormat} />],
    ...(isPlatform ? [['Installation', mono(player.provider_instance)] as Row] : []),
    ['Player UUID', <CopyableText text={player.uuid} />],
  ];
  const launch = [player.first_currency, player.first_locale, player.first_ip, player.first_game];
  const firstLaunch: Row[] = [['Currency', empty(player.first_currency)], ['Locale', empty(player.first_locale)], ['IP', mono(player.first_ip)], ['Game', mono(player.first_game)]];

  return <AdminPage>
    {back}
    <Card>
      <CardHeader>
        <CardTitle className="font-mono">{player.external_id}</CardTitle>
        <CardDescription>{brandLabel(player)}</CardDescription>
      </CardHeader>
      <CardContent><DetailList rows={details} /></CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>First launch</CardTitle></CardHeader>
      <CardContent>
        {launch.every((value) => value === null)
          ? <p className="text-sm text-muted-foreground">Not recorded (the player was seen before 2026-10-11, or came from a freespin).</p>
          : <DetailList rows={firstLaunch} />}
      </CardContent>
    </Card>
  </AdminPage>;
}

type Row = [string, ReactNode];

function DetailList({ rows }: { rows: Row[] }) {
  return <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-[max-content_1fr]">
    {rows.map(([label, value]) => <div key={label} className="grid gap-1 sm:col-span-2 sm:grid-cols-subgrid sm:items-center">
      <dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-words">{value}</dd>
    </div>)}
  </dl>;
}
