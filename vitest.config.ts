import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./tests/setup/setup.ts"],
    pool: "forks", // Use forks to isolate tests
    poolOptions: {
      forks: {
        singleFork: true // Run tests in a single fork for better DB isolation
      }
    },
    testTimeout: 10000, // 10 second timeout for tests
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./shared"),
      "@server": path.resolve(__dirname, "./server"),
    },
  },
});
