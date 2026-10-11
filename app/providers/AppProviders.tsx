import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
export function AppProviders({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}><TooltipProvider>{children}<Toaster theme="light" position="top-right" richColors={false} /></TooltipProvider></QueryClientProvider>;
}
