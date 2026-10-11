import { CircleCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { SubmitButton } from '@/components/common/SubmitButton';
import { InlineError } from '@/components/feedback/QueryState';
import { TextField } from '@/components/forms/FormFields';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useZodForm } from '@/lib/forms';
import { apiErrorMessage } from '../../../api/client';
import { AuthCard } from '../components/AuthCard';
import { useAccountMutations } from '../hooks/useAuth';
import { passwordSchema } from '../schemas/authSchemas';

function fragmentToken(): string { return new URLSearchParams(window.location.hash.slice(1)).get('token') ?? ''; }

const emailSchema = z.object({ email: z.string().email('Enter a valid email.') });

export function ForgotPasswordPage() {
  const { forgotPassword } = useAccountMutations(); const [sent, setSent] = useState(false); const [error, setError] = useState<string>();
  const form = useZodForm(emailSchema, { email: '' });
  if (sent) {
    return <AuthCard title="Check your email">
      <div className="flex flex-col gap-4">
        <Alert><CircleCheckIcon /><AlertTitle>If that email exists, reset instructions have been sent.</AlertTitle></Alert>
        <Button variant="link" className="self-center" asChild><Link to="/login">Back to sign in</Link></Button>
      </div>
    </AuthCard>;
  }
  return <AuthCard title="Reset password" description="Enter your email to receive reset instructions.">
    <form noValidate onSubmit={form.handleSubmit(async ({ email }) => { setError(undefined); try { await forgotPassword.mutateAsync(email); setSent(true); } catch (cause) { setError(apiErrorMessage(cause)); } })}>
      <FieldGroup>
        {error ? <InlineError message={error} /> : null}
        <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
        <SubmitButton pending={forgotPassword.isPending} className="w-full">Send reset link</SubmitButton>
        <Button variant="link" className="self-center" asChild><Link to="/login">Back to sign in</Link></Button>
      </FieldGroup>
    </form>
  </AuthCard>;
}

export function ResetPasswordPage() {
  const navigate = useNavigate(); const { resetPassword } = useAccountMutations(); const [error, setError] = useState<string>(); const token = fragmentToken();
  const form = useZodForm(passwordSchema, { password: '' });
  if (!token) return <AuthCard title="Reset password"><InlineError message="This reset link is incomplete or expired." /></AuthCard>;
  return <AuthCard title="Choose a new password">
    <form noValidate onSubmit={form.handleSubmit(async ({ password }) => { setError(undefined); try { await resetPassword.mutateAsync({ token, password }); navigate('/login', { state: { message: 'Password changed. Please sign in.' } }); } catch (cause) { setError(apiErrorMessage(cause)); } })}>
      <FieldGroup>
        {error ? <InlineError message={error} /> : null}
        <TextField control={form.control} name="password" label="New password" type="password" autoComplete="new-password" description="At least 12 characters." />
        <SubmitButton pending={resetPassword.isPending} className="w-full">Set password</SubmitButton>
      </FieldGroup>
    </form>
  </AuthCard>;
}
