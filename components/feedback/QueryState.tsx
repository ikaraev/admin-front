import { CircleAlertIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

export function LoadingState() { return <div className="flex min-h-44 items-center justify-center text-muted-foreground"><Spinner className="size-6" /></div>; }

export function ErrorState({ title = 'Unable to load this page', message }: { title?: string; message: string }) {
  return <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>{title}</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>;
}

export function InlineError({ message }: { message: string }) {
  return <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>{message}</AlertTitle></Alert>;
}
