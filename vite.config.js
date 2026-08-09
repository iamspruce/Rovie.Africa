import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// account-service sits behind a single shared secret (ROVIE_API_KEY) that also
// gates user registration, balance lookups and API-key minting. It must never
// reach the browser bundle, so the dev server proxies to it and attaches the
// header itself. The key is read WITHOUT a VITE_ prefix on purpose - that
// prefix is exactly what would expose it through import.meta.env.
//
// This mirrors what production needs: account-service's own server.ts says it
// should only ever be reachable from a backend you control, never from a page.
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const accountServiceOrigin = env.ROVIE_ACCOUNT_SERVICE_ORIGIN || 'http://localhost:4001';
  const accountServiceKey = env.ROVIE_API_KEY;

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/account': {
          target: accountServiceOrigin,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/account/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (accountServiceKey) {
                proxyReq.setHeader('Authorization', `Bearer ${accountServiceKey}`);
              }
            });
            proxy.on('error', (err) => {
              console.error(`[account-service proxy] ${err.message}`);
            });
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      testTimeout: 20000,
    },
  };
});
