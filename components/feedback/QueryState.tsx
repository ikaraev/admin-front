import { Alert, Spin } from 'antd';
import type { ReactNode } from 'react';

export function LoadingState(): ReactNode { return <div className="centered"><Spin size="large" /></div>; }
export function ErrorState({ message }: { message: string }): ReactNode { return <Alert type="error" showIcon message="Unable to load this page" description={message} />; }
