import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC (not esbuild) so NestJS decorator metadata is emitted and constructor DI resolves.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    // Must match the secret the token helpers in src/test/auth.ts read back from the environment.
    env: { AUTH_SECRET: 'test-auth-secret-0123456789-abcdefghijklmnop' },
    include: ['src/**/*.spec.ts'],
    setupFiles: ['reflect-metadata'],
  },
});
