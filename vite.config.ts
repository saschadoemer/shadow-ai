import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022' },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/arch/**/*.test.ts'],
    // Name every test file and test on every run, in a terminal and in CI alike.
    reporters: ['tree'],
  },
});
