import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// PORT is only needed for the dev server (not for builds).
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 5173;

// BASE_PATH is set by Replit's workflow. For GitHub Pages CI builds,
// fall back to the repo sub-path so assets resolve correctly.
const basePath =
  process.env.BASE_PATH ??
  process.env.VITE_BASE_PATH ??
  '/Warrior-Cats-Family-Tree-Maker/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  // Expose SUPABASE_* secrets to the client via import.meta.env.
  // Replit: secrets named SUPABASE_URL / SUPABASE_ANON_KEY are exposed automatically.
  // GitHub Pages CI: use VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in Actions secrets.
  envPrefix: ['VITE_', 'SUPABASE_'],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
