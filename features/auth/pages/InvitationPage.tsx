import { useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { SubmitButton } from '@/components/common/SubmitButton';
import { InlineError } from '@/components/feedback/QueryState';
import { TextField } from '@/components/forms/FormFields';
import { FieldGroup } from '@/components/ui/field';
import { useZodForm } from '@/lib/forms';
import { apiErrorMessage } from '../../../api/client';
import { AuthCard } from '../components/AuthCard';
import { useAccountMutations } from '../hooks/useAuth';

const schema = z.object({ name: z.string().min(1, 'Name is required.'), password: z.string().min(12, 'Password must be at least 12 characters.') });
const token = () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';

export function InvitationPage() {
  const navigate = useNavigate(); const { acceptInvitation } = useAccountMutations(); const [error, setError] = useState<string>(); const form = useZodForm(schema, { name: '', password: '' }); const invitationToken = token();
  if (!invitationToken) return <AuthCard title="Accept invitation"><InlineError message="This invitation link is incomplete or expired." /></AuthCard>;
  return <AuthCard title="Complete your account">
    <form noValidate onSubmit={form.handleSubmit(async (values) => { setError(undefined); try { await acceptInvitation.mutateAsync({ token: invitationToken, ...values }); navigate('/login', { state: { message: 'Account created. Please sign in.' } }); } catch (cause) { setError(apiErrorMessage(cause)); } })}>
      <FieldGroup>
        {error ? <InlineError message={error} /> : null}
        <TextField control={form.control} name="name" label="Name" autoComplete="name" />
        <TextField control={form.control} name="password" label="Password" type="password" autoComplete="new-password" description="At least 12 characters." />
        <SubmitButton pending={acceptInvitation.isPending} className="w-full">Create account</SubmitButton>
      </FieldGroup>
    </form>
  </AuthCard>;
}
