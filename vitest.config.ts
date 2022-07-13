/// <reference types="vitest" />
// e2e tests for playground

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['./playground/**/*/__tests__/*.test.ts'],
    setupFiles: './playground/vitestSetup.ts',
    globalSetup: './playground/vitestGlobalSetup.ts',
    globals: true,
    hookTimeout: 20000,
  },
})
