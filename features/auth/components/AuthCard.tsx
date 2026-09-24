import { Card, Typography } from 'antd';
import type { PropsWithChildren } from 'react';

export function AuthCard({ title, children }: PropsWithChildren<{ title: string }>) {
  return <main className="auth-page"><Card className="auth-card"><Typography.Title level={2}>{title}</Typography.Title>{children}</Card></main>;
}
