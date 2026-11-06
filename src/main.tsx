import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { gateApiOn } from './api/ready';
import { App } from './app/App';
import { preloadRoutes } from './app/router';
import { StartupError } from './app/StartupError';
import { getDataSource } from './lib/dataSource';

async function startDataSource(): Promise<void> {
  if (getDataSource() !== 'mock') return;
  // Loaded on demand so live mode never downloads the fixtures or MSW.
  const { startMockWorker } = await import('./mocks/browser');
  await startMockWorker();
}

const container = document.getElementById('root');
if (container === null) throw new Error('Missing #root element.');
const root = createRoot(container);

function show(node: ReactNode): void {
  root.render(<StrictMode>{node}</StrictMode>);
}

preloadRoutes();
const dataSourceReady = startDataSource();
gateApiOn(dataSourceReady);

// The shell renders straight away; requests wait for the data source.
show(<App />);
dataSourceReady.catch((error: unknown) => {
  show(<StartupError error={error} />);
});
