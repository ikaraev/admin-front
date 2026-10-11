import type { PropsWithChildren, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthCard({ title, description, children }: PropsWithChildren<{ title: string; description?: ReactNode }>) {
  return <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4 sm:p-6">
    <span className="text-sm font-semibold tracking-tight text-[oklch(0.293_0.115_279.8)]">Game Provider Admin</span>
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle className="text-xl">{title}</CardTitle>{description ? <CardDescription>{description}</CardDescription> : null}</CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  </main>;
}
