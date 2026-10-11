import { CheckIcon, CopyIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { toast.error('Copying failed. Select the text and copy it manually.'); }
  };
  return <Button type="button" variant="ghost" size="icon-xs" onClick={copy} aria-label={label}>{copied ? <CheckIcon /> : <CopyIcon />}</Button>;
}

/** Monospace value with a copy button, for secrets, keys and codes. */
export function CopyableText({ text, className }: { text: string; className?: string }) {
  return <span className={cn('inline-flex max-w-full items-start gap-1 rounded-md bg-muted px-2 py-1 font-mono text-xs', className)}>
    <span className="min-w-0 break-all whitespace-pre-wrap select-all">{text}</span><CopyButton text={text} />
  </span>;
}
