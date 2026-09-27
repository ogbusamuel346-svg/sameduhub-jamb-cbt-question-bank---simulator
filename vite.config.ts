import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const neonAuthUrl = env.VITE_NEON_AUTH_URL || env.NEON_AUTH_BASE_URL;

  return {
    plugins: [react(), tailwindcss()],
    // Neon env pull provides NEON_AUTH_BASE_URL. Expose only that public Auth
    // URL to the browser under the Vite name expected by the auth client.
    define: neonAuthUrl
      ? {'import.meta.env.VITE_NEON_AUTH_URL': JSON.stringify(neonAuthUrl)}
      : undefined,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
