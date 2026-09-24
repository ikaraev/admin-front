import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import type { PropsWithChildren } from 'react';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
export function AppProviders({ children }: PropsWithChildren) { return <ConfigProvider theme={{ token: { colorPrimary: '#5b4bdb', borderRadius: 8 } }}><AntApp><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></AntApp></ConfigProvider>; }
