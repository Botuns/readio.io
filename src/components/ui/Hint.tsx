import { Tooltip } from 'radix-ui';
import type { ReactElement, ReactNode } from 'react';

interface HintProps {
  label: ReactNode;
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/** A tooltip for supplementary detail. Never the only place a fact is shown. */
export function Hint({ label, children, side = 'top' }: HintProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="tabular z-50 max-w-xs rounded-chip bg-ink px-2 py-1 text-xs font-medium text-canvas shadow-overlay"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
