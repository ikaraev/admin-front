import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

/** Submit button that disables itself while the request is pending, preventing duplicate submissions. */
export function SubmitButton({ pending, children, disabled, ...button }: Omit<ComponentProps<typeof Button>, 'type'> & { pending?: boolean }) {
  return <Button type="submit" disabled={pending || disabled} {...button}>{pending ? <Spinner /> : null}{children}</Button>;
}
