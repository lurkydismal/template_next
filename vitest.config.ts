import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: "node",
        globals: true,
        exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    },
});
