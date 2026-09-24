import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input, Space, Typography } from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../../../api/client';
import { AuthCard } from '../components/AuthCard';
import { useAccountMutations } from '../hooks/useAuth';
import { credentialsSchema } from '../schemas/authSchemas';
import type { SignInResult } from '../types/auth';
import { z } from 'zod';

type Credentials = z.infer<typeof credentialsSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAccountMutations();
  const [error, setError] = useState<string>();
  const form = useForm<Credentials>({ resolver: zodResolver(credentialsSchema), defaultValues: { email: '', password: '' } });
  const submit = form.handleSubmit(async (values) => {
    setError(undefined);
    try {
      const result: SignInResult = await signIn.mutateAsync(values);
      if (result.authenticated) navigate('/admin', { replace: true });
      else navigate('/two-factor', { state: result, replace: true });
    } catch (cause) { setError(apiErrorMessage(cause)); }
  });
  return <AuthCard title="Sign in"><Space direction="vertical" size="middle" style={{ width: '100%' }}>
    {error && <Alert type="error" showIcon message={error} />}
    <Form layout="vertical" onFinish={submit}>
      <Controller control={form.control} name="email" render={({ field, fieldState }) => <Form.Item label="Email" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}><Input {...field} autoComplete="email" /></Form.Item>} />
      <Controller control={form.control} name="password" render={({ field, fieldState }) => <Form.Item label="Password" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}><Input.Password {...field} autoComplete="current-password" /></Form.Item>} />
      <Button type="primary" htmlType="submit" block loading={signIn.isPending}>Sign in</Button>
    </Form>
    <Typography.Link><Link to="/forgot-password">Forgot password?</Link></Typography.Link>
  </Space></AuthCard>;
}
