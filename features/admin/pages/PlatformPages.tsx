import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmButton } from '@/components/common/ConfirmButton';
import { CopyableText } from '@/components/common/CopyableText';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SubmitButton } from '@/components/common/SubmitButton';
import { ErrorState } from '@/components/feedback/QueryState';
import { NumberField, SelectField, SwitchField, TextField, type Option } from '@/components/forms/FormFields';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FieldGroup, FieldSeparator } from '@/components/ui/field';
import { optionalNumber, optionalText, optionalUrl, requiredNumber, requiredText, splitList, useZodForm } from '@/lib/forms';
import { useMe } from '@/features/auth/hooks/useAuth';
import { apiErrorMessage } from '../../../api/client';
import { action, adminApi, create, list, read, remove, update, type Credential, type Currency, type Operator, type ProviderInstance } from '../api/adminApi';
import { AdminPage, DataTable, FormSheet, ReloadButton, ServerTable, rowActionsClassName, type Column } from '../components/AdminPage';

const TIMEZONE_OPTIONS: Option[] = [
  'UTC', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Istanbul',
  'Asia/Dubai', 'Asia/Tbilisi', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo',
  'Africa/Cairo', 'Africa/Johannesburg', 'Australia/Sydney', 'Pacific/Auckland',
].map((value) => ({ value, label: value }));

const LOCALE_OPTIONS: Option[] = [
  { value: 'en', label: 'English (en)' }, { value: 'ru', label: 'Russian (ru)' },
  { value: 'ka', label: 'Georgian (ka)' }, { value: 'tr', label: 'Turkish (tr)' },
  { value: 'de', label: 'German (de)' }, { value: 'es', label: 'Spanish (es)' },
  { value: 'fr', label: 'French (fr)' }, { value: 'pt', label: 'Portuguese (pt)' },
];

/** Keeps a saved value selectable even when it is not one of the preset options. */
const withCurrent = (options: Option[], current?: string | null): Option[] => (current && !options.some((option) => option.value === current) ? [{ value: current, label: current }, ...options] : options);

const showError = (error: unknown) => toast.error(apiErrorMessage(error));

export function ProviderInstancesPage() {
  const query = useQuery({ queryKey: ['provider-instances'], queryFn: adminApi.providerInstances });
  const columns: Column<ProviderInstance>[] = [{ key: 'name', title: 'Name' }, { key: 'code', title: 'Code' }, { key: 'type', title: 'Type' }, { key: 'jurisdiction', title: 'Jurisdiction' }, { key: 'operators_count', title: 'Operators', className: 'text-right tabular-nums' }, { key: 'status', title: 'Status', render: (row) => <StatusBadge tone={row.status === 'active' ? 'success' : 'neutral'}>{row.status}</StatusBadge> }];
  return <AdminPage actions={<ReloadButton onClick={() => query.refetch()} pending={query.isFetching} />}>
    {query.isError ? <ErrorState message={apiErrorMessage(query.error)} /> : <DataTable rows={query.data ?? []} columns={columns} rowKey={(row) => row.uuid} loading={query.isFetching} />}
  </AdminPage>;
}

const currencyBaseSchema = z.object({ name: requiredText(), symbol: optionalText, units: requiredNumber(undefined, z.number().int('Use a whole number.').min(0, 'Use 0–8.').max(8, 'Use 0–8.')) });
const currencyCreateSchema = currencyBaseSchema.extend({ code: requiredText(), is_crypto: z.boolean() });
const currencyEditSchema = currencyBaseSchema.extend({ is_active: z.boolean() });

export function CurrenciesPage() {
  const client = useQueryClient(); const [editing, setEditing] = useState<Currency | null | undefined>();
  const query = useQuery({ queryKey: ['currencies'], queryFn: () => adminApi.currencies() });
  const save = useMutation({ mutationFn: (values: Record<string, unknown>) => editing ? update<Currency>(`/platform/currencies/${editing.code}`, { ...values, version: editing.version }) : create<Currency>('/platform/currencies', values), onSuccess: () => { client.invalidateQueries({ queryKey: ['currencies'] }); setEditing(undefined); toast.success('Currency saved.'); }, onError: showError });
  const columns: Column<Currency>[] = [{ key: 'code', title: 'Code', cellClassName: 'font-medium' }, { key: 'name', title: 'Name' }, { key: 'symbol', title: 'Symbol' }, { key: 'units', title: 'Units', className: 'text-right tabular-nums' }, { key: 'type', title: 'Type', render: (row) => row.is_crypto ? 'Crypto' : 'Fiat' }, { key: 'status', title: 'Status', render: (row) => <StatusBadge tone={row.is_active ? 'success' : 'neutral'}>{row.is_active ? 'active' : 'inactive'}</StatusBadge> }, { key: 'actions', title: '', className: 'text-right', render: (row) => <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>Edit</Button> }];
  return <AdminPage actions={<><ReloadButton onClick={() => query.refetch()} pending={query.isFetching} /><Button onClick={() => setEditing(null)}>Add currency</Button></>}>
    {query.isError ? <ErrorState message={apiErrorMessage(query.error)} /> : <DataTable rows={query.data ?? []} columns={columns} rowKey={(row) => row.code} loading={query.isLoading} />}
    <FormSheet open={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? `Edit ${editing.code}` : 'Add currency'}>
      {editing ? <CurrencyEditForm currency={editing} pending={save.isPending} onSubmit={(values) => save.mutate(values)} /> : <CurrencyCreateForm pending={save.isPending} onSubmit={(values) => save.mutate(values)} />}
    </FormSheet>
  </AdminPage>;
}

function CurrencyCreateForm({ pending, onSubmit }: { pending: boolean; onSubmit: (values: z.output<typeof currencyCreateSchema>) => void }) {
  const form = useZodForm(currencyCreateSchema, { code: '', name: '', symbol: '', units: 2, is_crypto: false });
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)}><FieldGroup>
    <TextField control={form.control} name="code" label="Code" />
    <TextField control={form.control} name="name" label="Name" />
    <TextField control={form.control} name="symbol" label="Symbol" />
    <NumberField control={form.control} name="units" label="Minor units" min={0} max={8} />
    <SwitchField control={form.control} name="is_crypto" label="Cryptocurrency" />
    <SubmitButton pending={pending}>Save</SubmitButton>
  </FieldGroup></form>;
}

function CurrencyEditForm({ currency, pending, onSubmit }: { currency: Currency; pending: boolean; onSubmit: (values: z.output<typeof currencyEditSchema>) => void }) {
  const form = useZodForm(currencyEditSchema, { name: currency.name, symbol: currency.symbol, units: currency.units, is_active: currency.is_active });
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)}><FieldGroup>
    <TextField control={form.control} name="name" label="Name" />
    <TextField control={form.control} name="symbol" label="Symbol" />
    <NumberField control={form.control} name="units" label="Minor units" min={0} max={8} />
    <SwitchField control={form.control} name="is_active" label="Active" />
    <SubmitButton pending={pending}>Save</SubmitButton>
  </FieldGroup></form>;
}

const timeout = optionalNumber.refine((value) => value === undefined || (Number.isInteger(value) && value >= 500 && value <= 60000), 'Use 500–60000 ms.');
const operatorSchema = z.object({
  name: requiredText(), legal_name: optionalText, server_id: optionalText, provider_instance: optionalText,
  wallet_url: optionalUrl, wallet_timeout_ms: timeout, wallet_connect_timeout_ms: timeout, lobby_url: optionalUrl, deposit_url: optionalUrl,
  currencies: z.string().transform(splitList).refine((entries) => entries.length > 0, 'Enter at least one currency.'),
  reporting_currency: requiredText(), timezone: requiredText(), default_locale: requiredText(),
  is_test: z.boolean(), demo_enabled: z.boolean(), require_2fa: z.boolean(),
});
type OperatorValues = z.output<typeof operatorSchema>;

export function OperatorsPage() {
  const client = useQueryClient(); const [page, setPage] = useState(1); const [editing, setEditing] = useState<Operator | null | undefined>(); const [credentialsFor, setCredentialsFor] = useState<Operator>(); const navigate = useNavigate(); const canManageUsers = useMe().data?.permissions.some((permission) => permission === 'users.view' || permission === 'users.manage') ?? false;
  const query = useQuery({ queryKey: ['operators', page], queryFn: () => list<Operator>('/platform/operators', { page }) }); const instances = useQuery({ queryKey: ['provider-instances'], queryFn: adminApi.providerInstances }); const currencies = useQuery({ queryKey: ['currencies', 'active'], queryFn: () => adminApi.currencies(true) });
  const save = useMutation({ mutationFn: (value: OperatorValues) => editing ? update<Operator>(`/platform/operators/${editing.uuid}`, { ...value, version: editing.version }) : create<Operator>('/platform/operators', value), onSuccess: () => { client.invalidateQueries({ queryKey: ['operators'] }); setEditing(undefined); toast.success('Operator saved.'); }, onError: showError });
  const status = useMutation({ mutationFn: ({ uuid, next }: { uuid: string; next: string }) => create<Operator>(`/platform/operators/${uuid}/status`, { status: next }), onSuccess: () => client.invalidateQueries({ queryKey: ['operators'] }), onError: showError });
  const columns: Column<Operator>[] = [{ key: 'name', title: 'Name', cellClassName: 'font-medium' }, { key: 'server_id', title: 'Server ID' }, { key: 'instance', title: 'Instance', render: (row) => row.provider_instance.code }, { key: 'currencies', title: 'Currencies', render: (row) => row.currencies.join(', ') }, { key: 'brands_count', title: 'Brands', className: 'text-right tabular-nums' }, { key: 'status', title: 'Status', render: (row) => <StatusBadge tone={row.status === 'active' ? 'success' : 'warning'}>{row.status}</StatusBadge> }, { key: 'actions', title: '', render: (row) => <div className={rowActionsClassName}><Button variant="ghost" size="sm" onClick={() => setEditing(row)}>Edit</Button><Button variant="ghost" size="sm" onClick={() => setCredentialsFor(row)}>Keys</Button>{canManageUsers ? <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/users?operator=${row.uuid}`)}>Users</Button> : null}<Button variant="ghost" size="sm" disabled={status.isPending} onClick={() => status.mutate({ uuid: row.uuid, next: row.status === 'active' ? 'suspended' : 'active' })}>{row.status === 'active' ? 'Suspend' : 'Activate'}</Button></div> }];
  return <AdminPage actions={<Button onClick={() => setEditing(null)}>Add operator</Button>}>
    <ServerTable page={query.data} loading={query.isLoading} error={query.error} columns={columns} onChange={setPage} />
    <FormSheet wide open={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit operator' : 'Add operator'} description="To activate an operator, configure a wallet URL and create an active wallet-signing key from the Keys action.">
      <OperatorForm operator={editing ?? null} instances={instances.data ?? []} currencyHint={(currencies.data ?? []).map((currency) => currency.code).join(', ')} pending={save.isPending} onSubmit={(values) => save.mutate(values)} />
    </FormSheet>
    {credentialsFor ? <CredentialsDialog operator={credentialsFor} close={() => setCredentialsFor(undefined)} /> : null}
  </AdminPage>;
}

function OperatorForm({ operator, instances, currencyHint, pending, onSubmit }: { operator: Operator | null; instances: ProviderInstance[]; currencyHint: string; pending: boolean; onSubmit: (values: OperatorValues) => void }) {
  const form = useZodForm(operatorSchema, operator
    ? { name: operator.name, legal_name: operator.legal_name, server_id: operator.server_id, provider_instance: operator.provider_instance.code, wallet_url: operator.wallet_url, wallet_timeout_ms: operator.wallet_timeout_ms, wallet_connect_timeout_ms: operator.wallet_connect_timeout_ms, lobby_url: operator.lobby_url, deposit_url: operator.deposit_url, currencies: operator.currencies.join(','), reporting_currency: operator.reporting_currency, timezone: operator.timezone, default_locale: operator.default_locale, is_test: operator.is_test, demo_enabled: operator.demo_enabled, require_2fa: operator.require_2fa }
    : { name: '', currencies: '', reporting_currency: '', timezone: 'UTC', default_locale: 'en', is_test: false, demo_enabled: true, require_2fa: false });
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)}><FieldGroup>
    <TextField control={form.control} name="name" label="Name" />
    <TextField control={form.control} name="legal_name" label="Legal name" />
    <TextField control={form.control} name="server_id" label="Server ID" />
    <SelectField control={form.control} name="provider_instance" label="Provider instance" clearable options={withCurrent(instances.map((item) => ({ value: item.code, label: item.name })), operator?.provider_instance.code)} />
    <FieldSeparator>Wallet integration</FieldSeparator>
    <TextField control={form.control} name="wallet_url" label="Wallet URL" type="url" placeholder="https://casino.example.com/wallet" />
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberField control={form.control} name="wallet_timeout_ms" label="Wallet timeout (ms)" min={500} max={60000} />
      <NumberField control={form.control} name="wallet_connect_timeout_ms" label="Connect timeout (ms)" min={500} max={60000} />
    </div>
    <TextField control={form.control} name="lobby_url" label="Lobby URL" type="url" />
    <TextField control={form.control} name="deposit_url" label="Deposit URL" type="url" />
    <FieldSeparator>Currencies and locale</FieldSeparator>
    <TextField control={form.control} name="currencies" label="Currencies (comma-separated)" placeholder={currencyHint} />
    <TextField control={form.control} name="reporting_currency" label="Reporting currency" description="Must be one of the operator's currencies." />
    <SelectField control={form.control} name="timezone" label="Timezone" options={withCurrent(TIMEZONE_OPTIONS, operator?.timezone)} />
    <SelectField control={form.control} name="default_locale" label="Default locale" options={withCurrent(LOCALE_OPTIONS, operator?.default_locale)} />
    <FieldSeparator>Settings</FieldSeparator>
    <SwitchField control={form.control} name="is_test" label="Test operator" />
    <SwitchField control={form.control} name="demo_enabled" label="Demo enabled" />
    <SwitchField control={form.control} name="require_2fa" label="Require 2FA" />
    <SubmitButton pending={pending}>Save</SubmitButton>
  </FieldGroup></form>;
}

function CredentialsDialog({ operator, close }: { operator: Operator; close: () => void }) {
  const client = useQueryClient(); const [secret, setSecret] = useState<string>(); const query = useQuery({ queryKey: ['credentials', operator.uuid], queryFn: () => read<Credential[]>(`/platform/operators/${operator.uuid}/credentials`) });
  const refresh = () => client.invalidateQueries({ queryKey: ['credentials', operator.uuid] });
  const generate = useMutation({ mutationFn: (purpose: string) => create<Credential & { secret: string }>(`/platform/operators/${operator.uuid}/credentials`, { purpose }), onSuccess: (data) => { setSecret(data.secret); refresh(); }, onError: showError });
  const rotate = useMutation({ mutationFn: (uuid: string) => action<Credential & { secret: string }>(`/platform/operators/${operator.uuid}/credentials/${uuid}/rotate`), onSuccess: (data) => { setSecret(data.secret); refresh(); }, onError: showError });
  const revoke = useMutation({ mutationFn: (uuid: string) => remove(`/platform/operators/${operator.uuid}/credentials/${uuid}`), onSuccess: refresh, onError: showError });
  const columns: Column<Credential>[] = [{ key: 'purpose', title: 'Purpose' }, { key: 'key_id', title: 'Key ID', cellClassName: 'font-mono text-xs' }, { key: 'status', title: 'Status' }, { key: 'last_used_at', title: 'Last used' }, { key: 'actions', title: '', render: (row) => <div className={rowActionsClassName}><Button variant="ghost" size="sm" disabled={rotate.isPending} onClick={() => rotate.mutate(row.uuid)}>Rotate</Button><ConfirmButton variant="ghost" size="sm" className="text-destructive" title="Revoke this credential?" description="Requests signed with this key will be rejected." confirmLabel="Revoke" onConfirm={() => revoke.mutateAsync(row.uuid)}>Revoke</ConfirmButton></div> }];
  return <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader><DialogTitle>{operator.name}: credentials</DialogTitle><DialogDescription>Create, rotate or revoke the keys this operator uses.</DialogDescription></DialogHeader>
      {secret ? <Alert variant="destructive"><AlertTitle>Copy this secret now; it will not be shown again.</AlertTitle><AlertDescription><CopyableText text={secret} className="mt-1" /></AlertDescription></Alert> : null}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={generate.isPending} onClick={() => generate.mutate('wallet_signing')}>Create wallet-signing key</Button><Button variant="outline" disabled={generate.isPending} onClick={() => generate.mutate('api_inbound')}>Create inbound API key</Button></div>
      {query.isError ? <ErrorState message={apiErrorMessage(query.error)} /> : <div className="max-h-[50vh] overflow-y-auto"><DataTable rows={query.data ?? []} columns={columns} rowKey={(row) => row.uuid} loading={query.isLoading} emptyText="No credentials yet." /></div>}
    </DialogContent>
  </Dialog>;
}
