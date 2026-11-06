import { Copy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { copyText } from '@/lib/clipboard';
import { Hint } from './Hint';

interface CopyButtonProps {
  value: string;
  /** Accessible name and tooltip, for example "Copy email". */
  label: string;
  /** Toast text shown after copying, for example "Email copied". */
  confirmation: string;
  className?: string;
}

export function CopyButton({ value, label, confirmation, className }: CopyButtonProps) {
  return (
    <Hint label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={() => void copyText(value, confirmation)}
        className={cn(
          'relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-chip text-muted transition-colors duration-150 hover:bg-line hover:text-ink active:bg-line-strong pointer-coarse:size-11',
          className,
        )}
      >
        <Copy aria-hidden="true" className="size-3.5" />
      </button>
    </Hint>
  );
}
