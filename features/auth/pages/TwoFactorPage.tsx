import { Alert, Button, Descriptions, Form, Input, QRCode, Space, Typography } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../../../api/client';
import { AuthCard } from '../components/AuthCard';
import { useAccountMutations } from '../hooks/useAuth';
import type { SignInResult } from '../types/auth';

export function TwoFactorPage() {
  const navigate = useNavigate(); const location = useLocation(); const { verifyTwoFactor } = useAccountMutations();
  const challenge = location.state as SignInResult | null; const [error, setError] = useState<string>();
  if (!challenge || challenge.authenticated) { navigate('/login', { replace: true }); return null; }
  const enroll = challenge.challenge === 'two_factor_enrollment';
  const submit = async ({ code }: { code: string }) => {
    setError(undefined); try { const result = await verifyTwoFactor.mutateAsync({ challenge_token: challenge.challenge_token, code, enrollment: enroll }); if (result.authenticated) navigate('/admin', { replace: true }); } catch (cause) { setError(apiErrorMessage(cause)); }
  };
  return <AuthCard title={enroll ? 'Set up two-factor authentication' : 'Two-factor authentication'}><Space direction="vertical" size="middle" style={{ width: '100%' }}>
    {enroll && challenge.enrollment && <>
      <Typography.Paragraph>Scan this code in your authenticator app, or copy the setup secret manually. Then enter the generated code.</Typography.Paragraph>
      <div className="two-factor-qr"><QRCode value={challenge.enrollment.provisioning_uri} size={208} /></div>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Setup secret"><Typography.Text copyable={{ text: challenge.enrollment.secret }}>{challenge.enrollment.secret}</Typography.Text></Descriptions.Item>
        <Descriptions.Item label="Provisioning URI"><Typography.Text copyable>{challenge.enrollment.provisioning_uri}</Typography.Text></Descriptions.Item>
      </Descriptions>
    </>}
    {error && <Alert type="error" showIcon message={error} />}
    <Form layout="vertical" onFinish={submit}><Form.Item name="code" label="Authenticator or backup code" rules={[{ required: true, message: 'Enter a code.' }]}><Input autoFocus autoComplete="one-time-code" /></Form.Item><Button type="primary" htmlType="submit" block loading={verifyTwoFactor.isPending}>Verify</Button></Form>
  </Space></AuthCard>;
}
