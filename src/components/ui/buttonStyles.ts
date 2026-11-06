import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  className?: string | undefined;
}

/** Class list for the bevelled button, shared by `<Button>` and link buttons. */
export function buttonClassName({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn('btn', `btn-${variant}`, `btn-${size}`, iconOnly && 'btn-icon', className);
}
