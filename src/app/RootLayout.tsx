import { useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { ShortcutsSheet } from '@/features/shell/ShortcutsSheet';
import { TopBar } from '@/features/shell/TopBar';
import { useHotkeys } from '@/lib/useHotkeys';

export function RootLayout() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useHotkeys({ '?': () => setShortcutsOpen(true) });

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-ink px-3 py-2 text-sm font-medium text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <TopBar onOpenShortcuts={() => setShortcutsOpen(true)} />
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 pb-[env(safe-area-inset-bottom)] outline-none"
      >
        <Outlet />
      </main>
      <ShortcutsSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      {/* Returning to the table with Back restores where the auditor had scrolled to. */}
      <ScrollRestoration />
    </div>
  );
}
