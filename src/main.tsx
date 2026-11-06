import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { preloadRoutes } from './app/router';
import { StartupError } from './app/StartupError';
import { getDataSource } from './lib/dataSource';

async function prepare(): Promise<void> {
  if (getDataSource() !== 'mock') return;
  // Loaded on demand so live mode never downloads the fixtures or MSW.
  const { startMockWorker } = await import('./mocks/browser');
  await startMockWorker();
}

function mount(node: ReactNode): void {
  const container = document.getElementById('root');
  if (container === null) throw new Error('Missing #root element.');
  createRoot(container).render(<StrictMode>{node}</StrictMode>);
}

prepare().then(
  () => {
    mount(<App />);
    preloadRoutes();
  },
  (error: unknown) => mount(<StartupError error={error} />),
);
