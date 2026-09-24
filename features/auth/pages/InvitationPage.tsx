import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input } from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { apiErrorMessage } from '../../../api/client';
import { AuthCard } from '../components/AuthCard';
import { useAccountMutations } from '../hooks/useAuth';

const schema = z.object({ name: z.string().min(1, 'Name is required.'), password: z.string().min(12, 'Password must be at least 12 characters.') });
type InvitationInput = z.infer<typeof schema>;
const token = () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';

export function InvitationPage() {
  const navigate = useNavigate(); const { acceptInvitation } = useAccountMutations(); const [error, setError] = useState<string>(); const form = useForm<InvitationInput>({ resolver: zodResolver(schema), defaultValues: { name: '', password: '' } }); const invitationToken = token();
  if (!invitationToken) return <AuthCard title="Accept invitation"><Alert type="error" message="This invitation link is incomplete or expired." /></AuthCard>;
  return <AuthCard title="Complete your account"><Form layout="vertical" onFinish={form.handleSubmit(async (values) => { try { await acceptInvitation.mutateAsync({ token: invitationToken, ...values }); navigate('/login', { state: { message: 'Account created. Please sign in.' } }); } catch (cause) { setError(apiErrorMessage(cause)); } })}>{error && <Alert type="error" message={error} />}<Controller control={form.control} name="name" render={({ field, fieldState }) => <Form.Item label="Name" help={fieldState.error?.message} validateStatus={fieldState.error ? 'error' : ''}><Input {...field} autoComplete="name" /></Form.Item>} /><Controller control={form.control} name="password" render={({ field, fieldState }) => <Form.Item label="Password" help={fieldState.error?.message} validateStatus={fieldState.error ? 'error' : ''}><Input.Password {...field} autoComplete="new-password" /></Form.Item>} /><Button type="primary" htmlType="submit" loading={acceptInvitation.isPending}>Create account</Button></Form></AuthCard>;
}
