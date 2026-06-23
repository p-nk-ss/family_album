import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/helpers/env-setup.ts"],
    // Integration tests share a single real Neon DB — run files serially so
    // resetDb() in one file doesn't race with another file's beforeEach.
    fileParallelism: false,
  },
})
