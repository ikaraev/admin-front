import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input, Result, Space } from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { apiErrorMessage } from '../../../api/client';
import { AuthCard } from '../components/AuthCard';
import { useAccountMutations } from '../hooks/useAuth';
import { passwordSchema } from '../schemas/authSchemas';

function fragmentToken(): string { return new URLSearchParams(window.location.hash.slice(1)).get('token') ?? ''; }
export function ForgotPasswordPage() {
  const { forgotPassword } = useAccountMutations(); const [sent, setSent] = useState(false); const [error, setError] = useState<string>();
  return <AuthCard title="Reset password">{sent ? <Result status="success" title="If that email exists, reset instructions have been sent." extra={<Link to="/login">Back to sign in</Link>} /> : <Form layout="vertical" onFinish={async ({ email }) => { try { await forgotPassword.mutateAsync(email); setSent(true); } catch (cause) { setError(apiErrorMessage(cause)); } }}><Space direction="vertical" style={{ width: '100%' }}><Alert type="info" message="Enter your email to receive reset instructions." />{error && <Alert type="error" message={error} />}<Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}><Input autoComplete="email" /></Form.Item><Button type="primary" htmlType="submit" loading={forgotPassword.isPending}>Send reset link</Button></Space></Form>}</AuthCard>;
}
type PasswordInput = z.infer<typeof passwordSchema>;
export function ResetPasswordPage() {
  const navigate = useNavigate(); const { resetPassword } = useAccountMutations(); const [error, setError] = useState<string>(); const token = fragmentToken(); const form = useForm<PasswordInput>({ resolver: zodResolver(passwordSchema), defaultValues: { password: '' } });
  if (!token) return <AuthCard title="Reset password"><Alert type="error" message="This reset link is incomplete or expired." /></AuthCard>;
  return <AuthCard title="Choose a new password"><Form layout="vertical" onFinish={form.handleSubmit(async ({ password }) => { try { await resetPassword.mutateAsync({ token, password }); navigate('/login', { state: { message: 'Password changed. Please sign in.' } }); } catch (cause) { setError(apiErrorMessage(cause)); } })}>{error && <Alert type="error" message={error} />}<Controller control={form.control} name="password" render={({ field, fieldState }) => <Form.Item label="New password" help={fieldState.error?.message} validateStatus={fieldState.error ? 'error' : ''}><Input.Password {...field} autoComplete="new-password" /></Form.Item>} /><Button htmlType="submit" type="primary" loading={resetPassword.isPending}>Set password</Button></Form></AuthCard>;
}
