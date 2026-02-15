import { defineConfig } from "vitest/config";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
  ],
  test: {
    environment: "node",
    include: [
      "src/**/__tests__/**/*.test.{ts,tsx}",
      "convex/__tests__/**/*.test.{ts,tsx}",
    ],
  },
});
