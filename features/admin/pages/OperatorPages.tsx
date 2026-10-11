import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontalIcon } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmButton, ConfirmDialog } from '@/components/common/ConfirmButton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SubmitButton } from '@/components/common/SubmitButton';
import { ErrorState, LoadingState } from '@/components/feedback/QueryState';
import { CheckboxGroupField, TextareaField, TextField } from '@/components/forms/FormFields';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FieldGroup } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { optionalList, optionalText, requiredText, splitList, useZodForm } from '@/lib/forms';
import { apiErrorMessage } from '../../../api/client';
import { action, create, list, read, remove, update, type Brand, type ManagedUser, type Operator, type Permission, type Role } from '../api/adminApi';
import { AdminPage, DataTable, FormSheet, SectionHeading, ServerTable, rowActionsClassName, type Column } from '../components/AdminPage';
import { useAdminScope } from '../hooks/useScope';

const showError = (error: unknown) => toast.error(apiErrorMessage(error));

const brandSchema = z.object({ external_id: requiredText(), name: requiredText(), domains: z.string().transform(splitList), currencies: optionalList, lobby_url: optionalText, default_locale: optionalText });
type BrandValues = z.output<typeof brandSchema>;

export function BrandsPage() {
  const { scopePath, me, isPlatform } = useAdminScope(); const client = useQueryClient(); const [editing, setEditing] = useState<Brand | null | undefined>(); const [operatorUuid, setOperatorUuid] = useState<string>(); const [page, setPage] = useState(1);
  const operators = useQuery({ queryKey: ['operators-for-brands'], queryFn: () => list<Operator>('/platform/operators', { per_page: 100 }), enabled: isPlatform }); const brandPath = isPlatform ? (operatorUuid ? `/operators/${operatorUuid}` : '') : scopePath;
  const query = useQuery({ queryKey: ['brands', brandPath, page], queryFn: () => list<Brand>(`${brandPath}/brands`, { page }), enabled: Boolean(me.data && brandPath) });
  const save = useMutation({ mutationFn: (value: BrandValues) => editing ? update<Brand>(`${brandPath}/brands/${editing.uuid}`, { ...value, version: editing.version }) : create<Brand>(`${brandPath}/brands`, value), onSuccess: () => { client.invalidateQueries({ queryKey: ['brands', brandPath] }); setEditing(undefined); toast.success('Brand saved.'); }, onError: showError });
  const status = useMutation({ mutationFn: ({ uuid, next }: { uuid: string; next: string }) => action<Brand>(`${brandPath}/brands/${uuid}/status`, { status: next }), onSuccess: () => client.invalidateQueries({ queryKey: ['brands', brandPath] }), onError: showError });
  const columns: Column<Brand>[] = [{ key: 'name', title: 'Name', cellClassName: 'font-medium' }, { key: 'external_id', title: 'External ID' }, { key: 'currencies', title: 'Currencies', render: (row) => row.currencies?.join(', ') ?? 'Inherited' }, { key: 'status', title: 'Status', render: (row) => <StatusBadge tone={row.status === 'active' ? 'success' : 'neutral'}>{row.status}</StatusBadge> }, { key: 'actions', title: '', render: (row) => <div className={rowActionsClassName}><Button variant="ghost" size="sm" onClick={() => setEditing(row)}>Edit</Button><Button variant="ghost" size="sm" disabled={status.isPending} onClick={() => status.mutate({ uuid: row.uuid, next: row.status === 'active' ? 'disabled' : 'active' })}>{row.status === 'active' ? 'Disable' : 'Enable'}</Button></div> }];
  return <AdminPage actions={<Button disabled={!brandPath} onClick={() => setEditing(null)}>Add brand</Button>}>
    {isPlatform ? <Select value={operatorUuid} onValueChange={(value) => { setOperatorUuid(value); setPage(1); }}>
      <SelectTrigger className="w-full sm:w-80" aria-label="Operator"><SelectValue placeholder="Choose an operator" /></SelectTrigger>
      <SelectContent>{(operators.data?.items ?? []).map((operator) => <SelectItem key={operator.uuid} value={operator.uuid}>{operator.name}</SelectItem>)}</SelectContent>
    </Select> : null}
    {!brandPath ? <p className="text-sm text-muted-foreground">Select an operator to manage its brands.</p> : <>
      <ServerTable page={query.data} loading={query.isLoading} error={query.error} columns={columns} onChange={setPage} />
      <FormSheet open={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit brand' : 'Add brand'}>
        <BrandForm brand={editing ?? null} pending={save.isPending} onSubmit={(values) => save.mutate(values)} />
      </FormSheet>
    </>}
  </AdminPage>;
}

function BrandForm({ brand, pending, onSubmit }: { brand: Brand | null; pending: boolean; onSubmit: (values: BrandValues) => void }) {
  const form = useZodForm(brandSchema, brand
    ? { external_id: brand.external_id, name: brand.name, domains: brand.domains.join(','), currencies: brand.currencies?.join(',') ?? '', lobby_url: (brand.lobby_url as string | null | undefined) ?? '', default_locale: (brand.default_locale as string | null | undefined) ?? '' }
    : { external_id: '', name: '', domains: '', currencies: '', lobby_url: '', default_locale: '' });
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)}><FieldGroup>
    <TextField control={form.control} name="external_id" label="External ID" />
    <TextField control={form.control} name="name" label="Name" />
    <TextField control={form.control} name="domains" label="Domains (comma-separated)" />
    <TextField control={form.control} name="currencies" label="Currencies (comma-separated)" description="Leave empty to inherit the operator's currencies." />
    <TextField control={form.control} name="lobby_url" label="Lobby URL" type="url" />
    <TextField control={form.control} name="default_locale" label="Default locale" />
    <SubmitButton pending={pending}>Save</SubmitButton>
  </FieldGroup></form>;
}

const roleSchema = z.object({ name: requiredText(), description: optionalText, permissions: z.array(z.string()).min(1, 'Choose at least one permission.') });
type RoleValues = z.output<typeof roleSchema>;

export function RolesPage() {
  const { scopePath, me } = useAdminScope(); const client = useQueryClient(); const [editing, setEditing] = useState<Role | null | undefined>();
  const roleQuery = useQuery({ queryKey: ['roles', scopePath], queryFn: () => read<Role[]>(`${scopePath}/roles`), enabled: Boolean(me.data) });
  const permissions = useQuery({ queryKey: ['permissions', me.data?.operator_uuid], queryFn: () => read<Permission[]>(`/permissions?scope=${me.data?.operator_uuid ? 'operator' : 'platform'}`), enabled: Boolean(me.data) });
  const save = useMutation({ mutationFn: (value: RoleValues) => editing ? update<Role>(`${scopePath}/roles/${editing.uuid}`, { ...value, version: editing.version }) : create<Role>(`${scopePath}/roles`, value), onSuccess: () => { client.invalidateQueries({ queryKey: ['roles', scopePath] }); setEditing(undefined); toast.success('Role saved.'); }, onError: showError });
  const destroy = useMutation({ mutationFn: (uuid: string) => remove(`${scopePath}/roles/${uuid}`), onSuccess: () => client.invalidateQueries({ queryKey: ['roles', scopePath] }), onError: showError });
  const columns: Column<Role>[] = [{ key: 'name', title: 'Name', cellClassName: 'font-medium' }, { key: 'scope', title: 'Scope' }, { key: 'permissions', title: 'Permissions', className: 'text-right tabular-nums', render: (row) => row.permissions.length }, { key: 'users_count', title: 'Assigned users', className: 'text-right tabular-nums' }, { key: 'actions', title: '', render: (row) => <div className={rowActionsClassName}><Button variant="ghost" size="sm" onClick={() => setEditing(row)}>{row.is_system ? 'View' : 'View / edit'}</Button>{row.is_system ? null : <ConfirmButton variant="ghost" size="sm" className="text-destructive" title="Delete this role?" description={`“${row.name}” will be removed from every assigned user.`} confirmLabel="Delete" onConfirm={() => destroy.mutateAsync(row.uuid)}>Delete</ConfirmButton>}</div> }];
  return <AdminPage actions={<Button onClick={() => setEditing(null)}>Create role</Button>}>
    {roleQuery.isError ? <ErrorState message={apiErrorMessage(roleQuery.error)} /> : <DataTable rows={roleQuery.data ?? []} columns={columns} rowKey={(row) => row.uuid} loading={roleQuery.isLoading} />}
    <FormSheet wide open={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? editing.name : 'Create role'} description={editing?.is_system ? 'System roles cannot be changed.' : undefined}>
      <RoleForm role={editing ?? null} permissions={permissions.data ?? []} pending={save.isPending} onSubmit={(values) => save.mutate(values)} />
    </FormSheet>
  </AdminPage>;
}

function RoleForm({ role, permissions, pending, onSubmit }: { role: Role | null; permissions: Permission[]; pending: boolean; onSubmit: (values: RoleValues) => void }) {
  const form = useZodForm(roleSchema, { name: role?.name ?? '', description: role?.description ?? '', permissions: role?.permissions ?? [] });
  const locked = Boolean(role?.is_system);
  const options = permissions.map((permission) => ({ value: permission.slug, label: `${permission.group}: ${permission.description}` }));
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)}><FieldGroup>
    <TextField control={form.control} name="name" label="Name" disabled={locked} />
    <TextField control={form.control} name="description" label="Description" disabled={locked} />
    <CheckboxGroupField control={form.control} name="permissions" label="Permissions" options={options} disabled={locked} />
    {locked ? null : <SubmitButton pending={pending}>Save</SubmitButton>}
  </FieldGroup></form>;
}

/** No brand ticked means every brand of the operator (the API takes null for that). */
const brandAccess = z.array(z.string()).transform((uuids) => (uuids.length ? uuids : null));
const userBaseSchema = z.object({ name: requiredText(), role_uuids: z.array(z.string()).min(1, 'Choose at least one role.'), brand_uuids: brandAccess });
const userInviteSchema = userBaseSchema.extend({ email: z.string().email('Enter a valid email.'), locale: z.string().trim().transform((value) => value || undefined) });
type UserValues = z.output<typeof userBaseSchema> & Partial<Pick<z.output<typeof userInviteSchema>, 'email' | 'locale'>>;

const PLATFORM_USERS = 'platform';

/**
 * The platform manages its own users and, through `?operator=`, any operator's:
 * the same endpoints under `/operators/{uuid}`, so invitations, roles and brand
 * access follow that operator's rules. An operator only ever sees its own.
 */
export function UsersPage() {
  const { scopePath, me, isPlatform } = useAdminScope(); const client = useQueryClient(); const [page, setPage] = useState(1); const [editing, setEditing] = useState<ManagedUser | null | undefined>(); const [deleting, setDeleting] = useState<ManagedUser>();
  const [searchParams, setSearchParams] = useSearchParams(); const chosenOperator = isPlatform ? searchParams.get('operator') ?? '' : '';
  const usersPath = chosenOperator ? `/operators/${chosenOperator}` : scopePath; const forOperator = Boolean(chosenOperator) || !isPlatform;
  const operators = useQuery({ queryKey: ['operators-for-users'], queryFn: () => list<Operator>('/platform/operators', { per_page: 100 }), enabled: isPlatform });
  const query = useQuery({ queryKey: ['users', usersPath, page], queryFn: () => list<ManagedUser>(`${usersPath}/users`, { page }), enabled: Boolean(me.data) });
  const roles = useQuery({ queryKey: ['roles-for-users', usersPath], queryFn: () => read<Role[]>(`${usersPath}/roles`), enabled: Boolean(me.data) });
  const brands = useQuery({ queryKey: ['brands-for-users', usersPath], queryFn: () => list<Brand>(`${usersPath}/brands`, { per_page: 100 }), enabled: Boolean(me.data && forOperator) });
  const refresh = () => client.invalidateQueries({ queryKey: ['users', usersPath] });
  const save = useMutation({ mutationFn: (value: UserValues) => editing ? update<ManagedUser>(`${usersPath}/users/${editing.uuid}`, { ...value, version: editing.version }) : create<ManagedUser>(`${usersPath}/users`, value), onSuccess: () => { refresh(); setEditing(undefined); toast.success(editing ? 'User updated.' : 'Invitation sent.'); }, onError: showError });
  const userAction = useMutation({ mutationFn: ({ uuid, verb }: { uuid: string; verb: string }) => action<ManagedUser>(`${usersPath}/users/${uuid}/${verb}`), onSuccess: (_, { verb }) => { refresh(); if (verb === 'resend-invitation') toast.success('Invitation sent again.'); }, onError: showError });
  const destroy = useMutation({ mutationFn: (uuid: string) => remove(`${usersPath}/users/${uuid}`), onSuccess: refresh, onError: showError });
  const chooseOperator = (value: string) => { setSearchParams(value === PLATFORM_USERS ? {} : { operator: value }); setPage(1); setEditing(undefined); };
  const operatorName = (operators.data?.items ?? []).find((operator) => operator.uuid === chosenOperator)?.name;
  const roleOptions = (roles.data ?? []).map((role) => ({ value: role.uuid, label: role.name }));
  const brandOptions = forOperator ? (brands.data?.items ?? []).map((brand) => ({ value: brand.uuid, label: brand.name })) : null;
  const columns: Column<ManagedUser>[] = [
    { key: 'name', title: 'Name', cellClassName: 'font-medium' }, { key: 'email', title: 'Email' }, { key: 'roles', title: 'Roles', render: (row) => row.roles.map((role) => role.name).join(', ') },
    { key: 'status', title: 'Status', render: (row) => <StatusBadge tone={row.status === 'active' ? 'success' : row.status === 'blocked' ? 'danger' : 'warning'}>{row.status}</StatusBadge> },
    { key: '2fa', title: '2FA', render: (row) => row.two_factor_enabled ? 'Enabled' : '—' },
    { key: 'actions', title: '', render: (row) => <div className={rowActionsClassName}>
      <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>Edit</Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`More actions for ${row.name}`}><MoreHorizontalIcon /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {row.status === 'invited' ? <DropdownMenuItem onSelect={() => userAction.mutate({ uuid: row.uuid, verb: 'resend-invitation' })}>Resend invitation</DropdownMenuItem> : null}
          <DropdownMenuItem onSelect={() => userAction.mutate({ uuid: row.uuid, verb: row.status === 'blocked' ? 'unblock' : 'block' })}>{row.status === 'blocked' ? 'Unblock' : 'Block'}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => userAction.mutate({ uuid: row.uuid, verb: 'reset-2fa' })}>Reset 2FA</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => userAction.mutate({ uuid: row.uuid, verb: 'logout' })}>Log out everywhere</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(row)}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div> },
  ];
  return <AdminPage actions={<Button onClick={() => setEditing(null)}>Invite user</Button>}>
    {isPlatform ? <Select value={chosenOperator || PLATFORM_USERS} onValueChange={chooseOperator}>
      <SelectTrigger className="w-full sm:w-80" aria-label="Whose users"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={PLATFORM_USERS}>Platform users</SelectItem>
        {(operators.data?.items ?? []).map((operator) => <SelectItem key={operator.uuid} value={operator.uuid}>{operator.name}</SelectItem>)}
      </SelectContent>
    </Select> : null}
    <ServerTable page={query.data} loading={query.isLoading} error={query.error} columns={columns} onChange={setPage} />
    <FormSheet open={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit user' : operatorName ? `Invite user to ${operatorName}` : 'Invite user'} description={editing ? undefined : 'They get an email with a link to set their password. The link is valid for 72 hours.'}>
      {editing ? <UserEditForm user={editing} roleOptions={roleOptions} brandOptions={brandOptions} pending={save.isPending} onSubmit={(values) => save.mutate(values)} /> : <UserInviteForm key={usersPath} defaultLocale={(operators.data?.items ?? []).find((operator) => operator.uuid === chosenOperator)?.default_locale ?? 'en'} roleOptions={roleOptions} brandOptions={brandOptions} pending={save.isPending} onSubmit={(values) => save.mutate(values)} />}
    </FormSheet>
    <ConfirmDialog open={deleting !== undefined} onOpenChange={(open) => { if (!open) setDeleting(undefined); }} title="Delete this user?" description={deleting ? `${deleting.name} (${deleting.email}) will lose access immediately.` : undefined} confirmLabel="Delete" onConfirm={() => destroy.mutateAsync(deleting?.uuid ?? '')} />
  </AdminPage>;
}

/** Brand access exists only for an operator's users, so the platform's own forms get null. */
type Options = { value: string; label: string }[];

const BRAND_ACCESS_HINT = 'Leave all unticked for access to every brand, including future ones.';

function UserInviteForm({ defaultLocale, roleOptions, brandOptions, pending, onSubmit }: { defaultLocale: string; roleOptions: Options; brandOptions: Options | null; pending: boolean; onSubmit: (values: z.output<typeof userInviteSchema>) => void }) {
  const form = useZodForm(userInviteSchema, { email: '', name: '', locale: defaultLocale, role_uuids: [], brand_uuids: [] });
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)}><FieldGroup>
    <TextField control={form.control} name="email" label="Email" type="email" />
    <TextField control={form.control} name="name" label="Name" />
    <TextField control={form.control} name="locale" label="Locale" />
    <CheckboxGroupField control={form.control} name="role_uuids" label="Roles" options={roleOptions} />
    {brandOptions ? <CheckboxGroupField control={form.control} name="brand_uuids" label="Brand access" description={BRAND_ACCESS_HINT} options={brandOptions} /> : null}
    <SubmitButton pending={pending}>Send invitation</SubmitButton>
  </FieldGroup></form>;
}

function UserEditForm({ user, roleOptions, brandOptions, pending, onSubmit }: { user: ManagedUser; roleOptions: Options; brandOptions: Options | null; pending: boolean; onSubmit: (values: z.output<typeof userBaseSchema>) => void }) {
  const form = useZodForm(userBaseSchema, { name: user.name, role_uuids: user.roles.map((role) => role.uuid), brand_uuids: user.brand_uuids ?? [] });
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)}><FieldGroup>
    <TextField control={form.control} name="name" label="Name" />
    <CheckboxGroupField control={form.control} name="role_uuids" label="Roles" options={roleOptions} />
    {brandOptions ? <CheckboxGroupField control={form.control} name="brand_uuids" label="Brand access" description={BRAND_ACCESS_HINT} options={brandOptions} /> : null}
    <SubmitButton pending={pending}>Save</SubmitButton>
  </FieldGroup></form>;
}

const profileSchema = z.object({
  timezone: requiredText(), reporting_currency: requiredText(),
  contacts: z.string().transform((value, context) => {
    if (!value.trim()) return {};
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, string>;
    } catch { /* reported below */ }
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a JSON object, for example {"support": "help@example.com"}.' });
    return z.NEVER;
  }),
});

export function OperatorProfilePage() {
  const { scopePath, me, isPlatform } = useAdminScope(); const client = useQueryClient();
  const profile = useQuery({ queryKey: ['operator-profile', scopePath], queryFn: () => read<Record<string, unknown>>(`${scopePath}/profile`), enabled: Boolean(me.data && !isPlatform) });
  const integration = useQuery({ queryKey: ['operator-integration', scopePath], queryFn: () => read<Record<string, unknown>>(`${scopePath}/integration`), enabled: Boolean(me.data && !isPlatform) });
  const save = useMutation({ mutationFn: (value: z.output<typeof profileSchema>) => update<Record<string, unknown>>(`${scopePath}/profile`, { version: profile.data?.version, ...value }), onSuccess: () => { client.invalidateQueries({ queryKey: ['operator-profile', scopePath] }); toast.success('Profile saved.'); }, onError: showError });
  if (isPlatform) return <AdminPage><p className="text-sm text-muted-foreground">Select an operator through the Operators page to inspect its platform-managed settings.</p></AdminPage>;
  const integrationRows = integration.data ? Object.entries(integration.data).map(([key, value]) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value) })) : [];
  return <AdminPage>
    {profile.isLoading ? <LoadingState /> : profile.isError || !profile.data ? <ErrorState message={apiErrorMessage(profile.error)} /> : <ProfileForm key={String(profile.data.version)} profile={profile.data} pending={save.isPending} onSubmit={(values) => save.mutate(values)} />}
    <SectionHeading title="Integration" />
    {integration.isError ? <ErrorState message={apiErrorMessage(integration.error)} /> : <DataTable rows={integrationRows} rowKey={(row) => row.key} loading={integration.isLoading} columns={[{ key: 'key', title: 'Setting', cellClassName: 'font-medium' }, { key: 'value', title: 'Value', cellClassName: 'font-mono text-xs break-all whitespace-normal' }]} />}
  </AdminPage>;
}

function ProfileForm({ profile, pending, onSubmit }: { profile: Record<string, unknown>; pending: boolean; onSubmit: (values: z.output<typeof profileSchema>) => void }) {
  const form = useZodForm(profileSchema, { timezone: String(profile.timezone ?? ''), reporting_currency: String(profile.reporting_currency ?? ''), contacts: JSON.stringify(profile.contacts ?? {}, null, 2) });
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl"><FieldGroup>
    <TextField control={form.control} name="timezone" label="Timezone" />
    <TextField control={form.control} name="reporting_currency" label="Reporting currency" />
    <TextareaField control={form.control} name="contacts" label="Contacts (JSON)" rows={5} />
    <SubmitButton pending={pending} className="self-start">Save profile</SubmitButton>
  </FieldGroup></form>;
}
