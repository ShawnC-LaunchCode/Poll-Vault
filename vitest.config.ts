import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**/*", "node_modules/**/*"],
    server: {
      deps: {
        inline: ["multer"], // Force multer to be processed by Vite/Vitest
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "text-summary"],
      include: [
        "server/**/*.ts",
        "shared/**/*.ts",
        "client/src/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/node_modules/**",
        "**/dist/**",
        "**/*.config.ts",
        "**/types/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: "forks", // Use forks to isolate tests
    poolOptions: {
      forks: {
        singleFork: true // Run tests in a single fork for better DB isolation
      }
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@server": path.resolve(__dirname, "./server"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
