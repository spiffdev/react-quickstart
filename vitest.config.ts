import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so that the theme plugin, which needs the platform's build setup, isn't loaded in tests.
export default defineConfig({
    esbuild: { jsx: "automatic" },
    test: {
        environment: "jsdom",
        globals: true,
        include: ["src/**/*.test.{ts,tsx}"],
        setupFiles: ["src/test/setup.ts"],
    },
});
