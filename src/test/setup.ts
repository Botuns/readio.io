import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { setScenario } from '@/mocks/scenarios';
import { server } from '@/mocks/server';

// Route chunks are imported on demand, and the first import in a file can take
// over a second on slow hardware. The default one-second wait is too tight.
configure({ asyncUtilTimeout: 5000 });

/** Width the fake `matchMedia` reports. Tests switch it to exercise the mobile layout. */
export const viewport = { width: 1280 };

function matches(query: string): boolean {
  const minWidth = /\(min-width:\s*(\d+)px\)/.exec(query)?.[1];
  return minWidth === undefined ? false : viewport.width >= Number(minWidth);
}

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: matches(query),
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
}));

class ResizeObserverStub {
  observe(): void {
    return undefined;
  }
  unobserve(): void {
    return undefined;
  }
  disconnect(): void {
    return undefined;
  }
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  setScenario('default');
  viewport.width = 1280;
});

afterAll(() => {
  server.close();
});
