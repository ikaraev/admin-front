import { useState, type ComponentProps, type ReactNode } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type ConfirmProps = { title: string; description?: ReactNode; confirmLabel?: string; onConfirm: () => Promise<unknown> };

/** Controlled confirmation dialog; it stays open until `onConfirm` settles and closes only on success. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', onConfirm }: ConfirmProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [pending, setPending] = useState(false);
  const confirm = async () => {
    setPending(true);
    try { await onConfirm(); onOpenChange(false); } catch { /* the mutation's onError reports the failure */ } finally { setPending(false); }
  };
  return <AlertDialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle>{description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}</AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
        <Button variant="destructive" onClick={confirm} disabled={pending}>{pending ? <Spinner /> : null}{confirmLabel}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

/** Button that asks for confirmation before running a destructive action. */
export function ConfirmButton({ title, description, confirmLabel, onConfirm, children, ...button }: Omit<ComponentProps<typeof Button>, 'onClick' | 'title'> & ConfirmProps) {
  const [open, setOpen] = useState(false);
  return <>
    <Button {...button} onClick={() => setOpen(true)}>{children}</Button>
    <ConfirmDialog open={open} onOpenChange={setOpen} title={title} description={description} confirmLabel={confirmLabel} onConfirm={onConfirm} />
  </>;
}
