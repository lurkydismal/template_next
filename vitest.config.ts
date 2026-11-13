import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [tsconfigPaths()],
    resolve: {
        alias: {
            // `server-only` throws outside React's server condition; tests run in plain Node.
            "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
        },
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.{ts,tsx}"],
        exclude: ["tests/e2e/**", "node_modules/**"],
        // Integration tests share one PostgreSQL database; keep files from interleaving.
        fileParallelism: !process.env.TEST_DATABASE_URL,
        restoreMocks: true,
        coverage: {
            provider: "v8",
            reporter: ["text-summary", "html", "lcov"],
            reportsDirectory: "coverage",
            include: [
                "src/lib/**/*.ts",
                "src/app/api/**/*.ts",
                "src/proxy.ts",
                "src/db/index.ts",
                "src/utils/**/*.ts",
                "src/components/TableDataGrid/RowDialog/Content/*.ts",
            ],
            exclude: ["**/*.d.ts", "src/utils/stdlog/**"],
            // Security-critical modules must stay well covered by the fast (no-database) tests.
            thresholds: {
                "src/lib/dal/require-session.ts": { lines: 95, branches: 90 },
                "src/lib/dashboard/common/save-core.ts": { lines: 90, branches: 80 },
                "src/lib/dashboard/common/update_create.ts": { lines: 100 },
                "src/lib/dashboard/common/mutation-columns.ts": { lines: 100, branches: 100 },
                "src/lib/dashboard/common/function.ts": { lines: 95 },
                "src/lib/auth/config.ts": { lines: 90, branches: 90 },
                "src/lib/env.ts": { lines: 95, branches: 95 },
                "src/lib/health.ts": { lines: 95, branches: 90 },
                "src/app/api/notifications/route.ts": { lines: 95, branches: 90 },
                "src/app/api/health/**": { lines: 95 },
                "src/proxy.ts": { lines: 95 },
            },
        },
    },
});
