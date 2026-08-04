import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["e2e/**/*.e2e.test.ts"],
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 60_000,
  },
});
