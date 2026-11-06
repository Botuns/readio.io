import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { useCredentials } from '@/api/credentials';
import { TopBar } from '@/features/shell/TopBar';
import { getDataSource } from '@/lib/dataSource';
import { openSignIn, useSignInOpen } from '@/lib/signIn';
import { useHotkeys } from '@/lib/useHotkeys';

/** Downloaded the first time the shortcuts list is opened. */
const ShortcutsSheet = lazy(async () => {
  const module = await import('@/features/shell/ShortcutsSheet');
  return { default: module.ShortcutsSheet };
});

/** Downloaded the first time a sign-in is needed. */
const SignInDialog = lazy(async () => {
  const module = await import('@/features/shell/SignInDialog');
  return { default: module.SignInDialog };
});

export function RootLayout() {
  const credentials = useCredentials();
  const signInOpen = useSignInOpen();
  const [signInWanted, setSignInWanted] = useState(false);
  if (signInOpen && !signInWanted) setSignInWanted(true);

  // Live mode with nobody signed in: offer the portal's own sign-in straight
  // away. Requests are not sent without credentials, so the browser never gets
  // the chance to show its built-in password prompt.
  useEffect(() => {
    if (getDataSource() === 'live' && credentials === null) openSignIn();
  }, [credentials]);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shortcutsWanted, setShortcutsWanted] = useState(false);
  const openShortcuts = () => {
    setShortcutsWanted(true);
    setShortcutsOpen(true);
  };
  useHotkeys({ '?': openShortcuts });

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-ink px-3 py-2 text-sm font-medium text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <TopBar onOpenShortcuts={openShortcuts} />
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 pb-[env(safe-area-inset-bottom)] outline-none"
      >
        <Outlet />
      </main>
      {shortcutsWanted && (
        <Suspense fallback={null}>
          <ShortcutsSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        </Suspense>
      )}
      {signInWanted && (
        <Suspense fallback={null}>
          <SignInDialog />
        </Suspense>
      )}
      {/* Returning to the table with Back restores where the auditor had scrolled to. */}
      <ScrollRestoration />
    </div>
  );
}
