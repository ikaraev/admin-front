import { Fragment, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmButton } from '@/components/common/ConfirmButton';
import { CopyableText } from '@/components/common/CopyableText';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SubmitButton } from '@/components/common/SubmitButton';
import { ErrorState, InlineError, LoadingState } from '@/components/feedback/QueryState';
import { TextField } from '@/components/forms/FormFields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { FieldGroup } from '@/components/ui/field';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemSeparator, ItemTitle } from '@/components/ui/item';
import { requiredText, useZodForm } from '@/lib/forms';
import { apiErrorMessage } from '../../../api/client';
import { useAccountMutations, useMe, useSessions } from '../hooks/useAuth';

const showError = (cause: unknown) => toast.error(apiErrorMessage(cause));
type Dialogs = 'password' | 'setup' | 'disable' | null;

export function AccountPage() {
  const me = useMe(); const sessions = useSessions(); const actions = useAccountMutations();
  const [dialog, setDialog] = useState<Dialogs>(null); const [setupSecret, setSetupSecret] = useState<string>(); const [backupCodes, setBackupCodes] = useState<string[]>();
  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState message="Your session may have expired." />;
  const closeDialog = () => { setDialog(null); setSetupSecret(undefined); };

  return <div className="flex flex-col gap-6">
    <Card>
      <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground">Name</dt><dd>{me.data.name}</dd>
          <dt className="text-muted-foreground">Email</dt><dd className="break-all">{me.data.email}</dd>
          <dt className="text-muted-foreground">Time zone</dt><dd>{me.data.timezone}</dd>
          <dt className="text-muted-foreground">Two-factor authentication</dt><dd>{me.data.two_factor_enabled ? <StatusBadge tone="success">Enabled</StatusBadge> : <StatusBadge tone="neutral">Not enabled</StatusBadge>}</dd>
        </dl>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Password</CardTitle><CardDescription>Choose a password of at least 12 characters.</CardDescription></CardHeader>
      <CardContent><Button variant="outline" onClick={() => setDialog('password')}>Change password</Button></CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Two-factor authentication</CardTitle><CardDescription>Require a code from your authenticator app when signing in.</CardDescription></CardHeader>
      <CardContent>{me.data.two_factor_enabled ? <Button variant="destructive" onClick={() => setDialog('disable')}>Disable</Button> : <Button onClick={() => setDialog('setup')}>Set up two-factor authentication</Button>}</CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Active sessions</CardTitle></CardHeader>
      <CardContent>
        {sessions.isLoading ? <LoadingState /> : sessions.isError ? <InlineError message="Unable to load sessions." /> : !sessions.data?.length ? <Empty className="p-6"><EmptyHeader><EmptyTitle>No active sessions.</EmptyTitle></EmptyHeader></Empty> : <ItemGroup>
          {sessions.data.map((session, index) => <Fragment key={session.uuid}>{index > 0 ? <ItemSeparator /> : null}<Item size="sm" className="px-0">
            <ItemContent className="min-w-0">
              <ItemTitle>{session.current ? 'Current session' : session.ip ?? 'Unknown location'}</ItemTitle>
              <ItemDescription className="truncate">{session.user_agent ?? 'Unknown device'} · last used {new Date(session.last_used_at).toLocaleString()}</ItemDescription>
            </ItemContent>
            {session.current ? null : <ItemActions><ConfirmButton variant="ghost" size="sm" className="text-destructive" title="Revoke this session?" description="The device will be signed out immediately." confirmLabel="Revoke" onConfirm={async () => { try { await actions.revokeSession.mutateAsync(session.uuid); toast.success('Session revoked.'); } catch (cause) { showError(cause); throw cause; } }}>Revoke</ConfirmButton></ItemActions>}
          </Item></Fragment>)}
        </ItemGroup>}
      </CardContent>
    </Card>

    <Dialog open={dialog === 'password'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Change password</DialogTitle><DialogDescription>Other sessions stay signed in until they expire or you revoke them.</DialogDescription></DialogHeader>
        <PasswordForm pending={actions.changePassword.isPending} onSubmit={async (values) => { try { await actions.changePassword.mutateAsync(values); toast.success('Password changed.'); closeDialog(); } catch (cause) { showError(cause); } }} />
      </DialogContent>
    </Dialog>

    <Dialog open={dialog === 'setup'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Set up two-factor authentication</DialogTitle><DialogDescription>{setupSecret ? 'Add this secret to your authenticator app, then enter the generated code.' : 'Confirm your password to receive an authenticator secret.'}</DialogDescription></DialogHeader>
        {setupSecret
          ? <EnableTwoFactorForm secret={setupSecret} pending={actions.enableTwoFactor.isPending} onSubmit={async ({ code }) => { try { const result = await actions.enableTwoFactor.mutateAsync(code); closeDialog(); setBackupCodes(result.backup_codes); } catch (cause) { showError(cause); } }} />
          : <ConfirmPasswordForm pending={actions.setupTwoFactor.isPending} onSubmit={async ({ currentPassword }) => { try { const result = await actions.setupTwoFactor.mutateAsync(currentPassword); setSetupSecret(result.secret); } catch (cause) { showError(cause); } }} />}
      </DialogContent>
    </Dialog>

    <Dialog open={dialog === 'disable'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Disable two-factor authentication?</DialogTitle><DialogDescription>Your account will be protected by your password only.</DialogDescription></DialogHeader>
        <DisableTwoFactorForm pending={actions.disableTwoFactor.isPending} onSubmit={async (values) => { try { await actions.disableTwoFactor.mutateAsync(values); toast.success('Two-factor authentication disabled.'); closeDialog(); } catch (cause) { showError(cause); } }} />
      </DialogContent>
    </Dialog>

    <Dialog open={backupCodes !== undefined} onOpenChange={(open) => { if (!open) setBackupCodes(undefined); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Save your backup codes</DialogTitle><DialogDescription>Each code works once. Store them somewhere safe; they will not be shown again.</DialogDescription></DialogHeader>
        <CopyableText text={(backupCodes ?? []).join('\n')} className="w-full justify-between p-3 text-sm" />
        <DialogFooter><Button onClick={() => setBackupCodes(undefined)}>I saved them</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

const passwordChangeSchema = z.object({ currentPassword: requiredText('Enter your current password.'), password: z.string().min(12, 'Password must be at least 12 characters.') });
function PasswordForm({ onSubmit, pending }: { onSubmit: (values: z.output<typeof passwordChangeSchema>) => Promise<void>; pending: boolean }) {
  const form = useZodForm(passwordChangeSchema, { currentPassword: '', password: '' });
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)}><FieldGroup>
    <TextField control={form.control} name="currentPassword" label="Current password" type="password" autoComplete="current-password" />
    <TextField control={form.control} name="password" label="New password" type="password" autoComplete="new-password" description="At least 12 characters." />
    <DialogFooter><SubmitButton pending={pending}>Change password</SubmitButton></DialogFooter>
  </FieldGroup></form>;
}

const confirmPasswordSchema = z.object({ currentPassword: requiredText('Enter your current password.') });
function ConfirmPasswordForm({ onSubmit, pending }: { onSubmit: (values: z.output<typeof confirmPasswordSchema>) => Promise<void>; pending: boolean }) {
  const form = useZodForm(confirmPasswordSchema, { currentPassword: '' });
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)}><FieldGroup>
    <TextField control={form.control} name="currentPassword" label="Current password" type="password" autoComplete="current-password" />
    <DialogFooter><SubmitButton pending={pending}>Continue</SubmitButton></DialogFooter>
  </FieldGroup></form>;
}

const disableSchema = z.object({ currentPassword: requiredText('Enter your current password.'), code: requiredText('Enter a code.') });
function DisableTwoFactorForm({ onSubmit, pending }: { onSubmit: (values: z.output<typeof disableSchema>) => Promise<void>; pending: boolean }) {
  const form = useZodForm(disableSchema, { currentPassword: '', code: '' });
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)}><FieldGroup>
    <TextField control={form.control} name="currentPassword" label="Current password" type="password" autoComplete="current-password" />
    <TextField control={form.control} name="code" label="Authenticator code" autoComplete="one-time-code" />
    <DialogFooter><SubmitButton variant="destructive" pending={pending}>Disable two-factor authentication</SubmitButton></DialogFooter>
  </FieldGroup></form>;
}

const enableSchema = z.object({ code: requiredText('Enter a code.') });
function EnableTwoFactorForm({ secret, onSubmit, pending }: { secret: string; onSubmit: (values: z.output<typeof enableSchema>) => Promise<void>; pending: boolean }) {
  const form = useZodForm(enableSchema, { code: '' });
  return <form noValidate onSubmit={form.handleSubmit(onSubmit)}><FieldGroup>
    <CopyableText text={secret} className="w-full justify-between p-3 text-sm" />
    <TextField control={form.control} name="code" label="Authenticator code" autoComplete="one-time-code" />
    <DialogFooter><SubmitButton pending={pending}>Enable</SubmitButton></DialogFooter>
  </FieldGroup></form>;
}
