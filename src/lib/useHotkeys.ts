import { useEffect, useEffectEvent } from 'react';

type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

/**
 * Single-key shortcuts (`/`, `j`, `?`, `1`). They never fire while the user is
 * typing in a field or holding a modifier, so browser shortcuts keep working.
 */
export function useHotkeys(hotkeys: HotkeyMap, enabled = true): void {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (isTyping(event.target)) return;
    hotkeys[event.key]?.(event);
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      onKeyDown(event);
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [enabled]);
}
