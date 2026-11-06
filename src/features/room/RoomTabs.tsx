import { motion } from 'motion/react';
import { Tabs } from 'radix-ui';
import type { ReactNode } from 'react';
import type { RoomTab } from '@/lib/routes';
import { isRoomTab } from './roomSearchParams';

interface TabDefinition {
  value: RoomTab;
  label: string;
  /** Used below the `md` breakpoint, where three long labels do not fit. */
  shortLabel: string;
  shortcut: string;
}

const TABS: TabDefinition[] = [
  { value: 'transcript', label: 'Transcript', shortLabel: 'Transcript', shortcut: '1' },
  { value: 'identity', label: 'Identity verification', shortLabel: 'Identity', shortcut: '2' },
  { value: 'integrity', label: 'Integrity audit', shortLabel: 'Integrity', shortcut: '3' },
];

interface RoomTabsProps {
  tab: RoomTab;
  onTabChange: (tab: RoomTab) => void;
  /** Number shown on the Integrity tab when anything is flagged. */
  flaggedCount: number;
  panels: Record<RoomTab, ReactNode>;
}

/**
 * Sticky tabs driven by the URL. Below `md` they are a full-width segmented
 * control; above it, an underlined tab bar. The indicator slides between tabs.
 * Activation is manual so arrow keys move focus without filling browser history.
 */
export function RoomTabs({ tab, onTabChange, flaggedCount, panels }: RoomTabsProps) {
  return (
    <Tabs.Root
      value={tab}
      activationMode="manual"
      onValueChange={(value) => {
        if (isRoomTab(value)) onTabChange(value);
      }}
    >
      <div className="sticky top-0 z-20 -mx-4 bg-canvas px-4 py-2 md:mx-0 md:px-0 md:py-0">
        <Tabs.List
          aria-label="Room evaluation sections"
          className="grid grid-cols-3 rounded-control bg-sunken p-0.5 shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] md:flex md:gap-7 md:rounded-none md:border-b md:border-line md:bg-transparent md:p-0 md:shadow-none"
        >
          {TABS.map((definition) => {
            const active = definition.value === tab;
            return (
              <Tabs.Trigger
                key={definition.value}
                value={definition.value}
                aria-keyshortcuts={definition.shortcut}
                className="relative flex h-10 items-center justify-center gap-1.5 rounded-chip text-13 font-medium text-muted transition-colors duration-150 hover:text-ink data-[state=active]:text-ink md:h-11 md:rounded-none md:text-sm"
              >
                {active && (
                  <motion.span
                    layoutId="room-tab-indicator"
                    className="absolute inset-0 rounded-chip bg-(--btn-secondary-bg) shadow-(--btn-secondary-shadow) md:inset-x-0 md:top-auto md:-bottom-px md:h-0.5 md:rounded-none md:bg-accent md:shadow-none"
                  />
                )}
                <span className="relative md:hidden">{definition.shortLabel}</span>
                <span className="relative hidden md:inline">{definition.label}</span>
                {definition.value === 'integrity' && flaggedCount > 0 && (
                  <span className="tabular relative inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-soft px-1 text-2xs font-semibold text-danger">
                    {flaggedCount}
                    <span className="sr-only"> flagged</span>
                  </span>
                )}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>
      </div>

      {TABS.map((definition) => (
        <Tabs.Content
          key={definition.value}
          value={definition.value}
          className="mt-4 outline-none md:mt-5"
        >
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {panels[definition.value]}
          </motion.div>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
