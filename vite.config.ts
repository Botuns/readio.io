/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

const PROXY_PREFIX = '/api/jobs';
const DEFAULT_UPSTREAM = 'https://readie001.uc.r.appspot.com/auth/recording/jobs';

/**
 * The Readie API only allows browser origins on readie.io, so the app talks to a
 * same-origin path and this proxy forwards it. The client still attaches every
 * auth header; the proxy adds nothing and only drops `Origin`, which the API
 * would otherwise reject.
 */
function createApiProxy(upstream: string): Record<string, ProxyOptions> {
  const url = new URL(upstream);
  const upstreamPath = url.pathname.replace(/\/$/, '');
  return {
    [PROXY_PREFIX]: {
      target: url.origin,
      changeOrigin: true,
      rewrite: (path) => upstreamPath + path.slice(PROXY_PREFIX.length),
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.removeHeader('origin');
          proxyReq.removeHeader('referer');
        });
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = createApiProxy(env.API_PROXY_TARGET ?? DEFAULT_UPSTREAM);

  return {
    plugins: [react(), tailwindcss()],
    resolve: { tsconfigPaths: true },
    server: { proxy },
    preview: { proxy },
    build: {
      target: 'es2022',
      sourcemap: false,
      // The only chunk above 500 kB is the mock layer (MSW plus fixtures), which
      // is loaded on demand and never in live mode.
      chunkSizeWarningLimit: 600,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      maxWorkers: 2,
      // Node's fetch needs an absolute URL; the browser build uses the relative proxy path.
      env: {
        VITE_API_BASE_URL: 'http://localhost:3000/api/jobs',
        VITE_API_CUSTOM_AUTH: 'test-custom-auth',
        VITE_API_BASIC_AUTH: 'dGVzdDp0ZXN0',
        VITE_DATA_SOURCE: 'mock',
      },
    },
  };
});
