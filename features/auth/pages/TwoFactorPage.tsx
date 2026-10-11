import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { CopyableText } from '@/components/common/CopyableText';
import { SubmitButton } from '@/components/common/SubmitButton';
import { InlineError } from '@/components/feedback/QueryState';
import { TextField } from '@/components/forms/FormFields';
import { FieldGroup } from '@/components/ui/field';
import { useZodForm } from '@/lib/forms';
import { apiErrorMessage } from '../../../api/client';
import { AuthCard } from '../components/AuthCard';
import { useAccountMutations } from '../hooks/useAuth';
import type { SignInResult } from '../types/auth';

const codeSchema = z.object({ code: z.string().trim().min(1, 'Enter a code.') });

export function TwoFactorPage() {
  const navigate = useNavigate(); const location = useLocation(); const { verifyTwoFactor } = useAccountMutations();
  const challenge = location.state as SignInResult | null; const [error, setError] = useState<string>();
  const form = useZodForm(codeSchema, { code: '' });
  if (!challenge || challenge.authenticated) return <Navigate to="/login" replace />;
  const enroll = challenge.challenge === 'two_factor_enrollment';
  const submit = form.handleSubmit(async ({ code }) => {
    setError(undefined); try { const result = await verifyTwoFactor.mutateAsync({ challenge_token: challenge.challenge_token, code, enrollment: enroll }); if (result.authenticated) navigate('/admin', { replace: true }); } catch (cause) { setError(apiErrorMessage(cause)); }
  });
  return <AuthCard title={enroll ? 'Set up two-factor authentication' : 'Two-factor authentication'} description={enroll ? 'Scan this code in your authenticator app, or copy the setup secret manually. Then enter the generated code.' : 'Enter the code from your authenticator app, or a backup code.'}>
    <div className="flex flex-col gap-5">
      {enroll && challenge.enrollment ? <>
        <div className="flex justify-center rounded-lg border bg-white p-4"><QRCodeSVG value={challenge.enrollment.provisioning_uri} size={208} /></div>
        <dl className="grid gap-3 text-sm">
          <div className="grid gap-1"><dt className="text-muted-foreground">Setup secret</dt><dd><CopyableText text={challenge.enrollment.secret} /></dd></div>
          <div className="grid gap-1"><dt className="text-muted-foreground">Provisioning URI</dt><dd><CopyableText text={challenge.enrollment.provisioning_uri} /></dd></div>
        </dl>
      </> : null}
      <form noValidate onSubmit={submit}>
        <FieldGroup>
          {error ? <InlineError message={error} /> : null}
          <TextField control={form.control} name="code" label="Authenticator or backup code" autoFocus autoComplete="one-time-code" />
          <SubmitButton pending={verifyTwoFactor.isPending} className="w-full">Verify</SubmitButton>
        </FieldGroup>
      </form>
    </div>
  </AuthCard>;
}
