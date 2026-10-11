import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
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
import { credentialsSchema } from '../schemas/authSchemas';
import type { SignInResult } from '../types/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { message?: string } | null)?.message;
  const { signIn } = useAccountMutations();
  const [error, setError] = useState<string>();
  const form = useZodForm(credentialsSchema, { email: '', password: '' });
  const submit = form.handleSubmit(async (values) => {
    setError(undefined);
    try {
      const result: SignInResult = await signIn.mutateAsync(values);
      if (result.authenticated) navigate('/admin', { replace: true });
      else navigate('/two-factor', { state: result, replace: true });
    } catch (cause) { setError(apiErrorMessage(cause)); }
  });
  return <AuthCard title="Sign in" description="Use your administrator account.">
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {notice ? <Alert><AlertTitle>{notice}</AlertTitle></Alert> : null}
        {error ? <InlineError message={error} /> : null}
        <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
        <TextField control={form.control} name="password" label="Password" type="password" autoComplete="current-password" />
        <SubmitButton pending={signIn.isPending} className="w-full">Sign in</SubmitButton>
        <Button variant="link" className="self-center" asChild><Link to="/forgot-password">Forgot password?</Link></Button>
      </FieldGroup>
    </form>
  </AuthCard>;
}
