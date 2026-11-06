import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { Button } from '@/components/ui/Button';

const SHORTCUTS: { keys: string[]; action: string; group: string }[] = [
  { group: 'Campaign overview', keys: ['/'], action: 'Focus email search' },
  { group: 'Campaign overview', keys: ['j'], action: 'Next candidate' },
  { group: 'Campaign overview', keys: ['k'], action: 'Previous candidate' },
  { group: 'Campaign overview', keys: ['Enter'], action: 'Open the focused candidate' },
  { group: 'Room evaluation', keys: ['1'], action: 'Transcript tab' },
  { group: 'Room evaluation', keys: ['2'], action: 'Identity verification tab' },
  { group: 'Room evaluation', keys: ['3'], action: 'Integrity audit tab' },
  { group: 'Anywhere', keys: ['?'], action: 'Show this list' },
  { group: 'Anywhere', keys: ['Esc'], action: 'Close a dialog or sheet' },
];

const GROUPS = [...new Set(SHORTCUTS.map((shortcut) => shortcut.group))];

interface ShortcutsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsSheet({ open, onOpenChange }: ShortcutsSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 dark:bg-canvas/70" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-sheet bg-surface p-5 shadow-overlay">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-ink">
                Keyboard shortcuts
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-13 text-muted">
                Shortcuts are ignored while you type in a field.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" iconOnly aria-label="Close">
                <X aria-hidden="true" className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          {GROUPS.map((group) => (
            <section key={group} className="mt-5">
              <h3 className="eyebrow">{group}</h3>
              <dl className="mt-2 divide-y divide-line">
                {SHORTCUTS.filter((shortcut) => shortcut.group === group).map((shortcut) => (
                  <div
                    key={shortcut.action}
                    className="flex items-center justify-between gap-4 py-2"
                  >
                    <dt className="text-sm text-ink">{shortcut.action}</dt>
                    <dd className="flex gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="inline-flex h-6 min-w-6 items-center justify-center rounded-chip border border-line-strong bg-sunken px-1.5 font-mono text-xs font-medium text-ink"
                        >
                          {key}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
