import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
const allBrowsers = process.env.E2E_ALL_BROWSERS === "true";

/**
 * End-to-end tests run against a *production build* (`next start`) backed by a migrated
 * PostgreSQL database. Prerequisites (see README "Testing"):
 *
 *   1. a database with migrations applied and the usual POSTGRES_* / DB_HOST variables set
 *   2. `pnpm build`
 *
 * Set E2E_BASE_URL to test an already running deployment instead of starting a server. Such a
 * target must have registration enabled (AUTH_DISABLE_SIGN_UP=false) so tests can create users.
 *
 * Two projects exist:
 *   - `api`      HTTP-level tests (no browser needed): auth, authorization, health, live updates
 *   - `chromium` browser tests; Firefox/WebKit are added with E2E_ALL_BROWSERS=true
 */
export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
    use: {
        baseURL,
        // Browsers always send Origin on POSTs; Better Auth rejects cookie-bearing POSTs without it.
        extraHTTPHeaders: { Origin: new URL(baseURL).origin },
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },

    projects: [
        { name: "api", testMatch: /.*\.api\.spec\.ts/ },
        {
            name: "chromium",
            testMatch: /.*\.ui\.spec\.ts/,
            use: { ...devices["Desktop Chrome"] },
        },
        ...(allBrowsers
            ? [
                  {
                      name: "firefox",
                      testMatch: /.*\.ui\.spec\.ts/,
                      use: { ...devices["Desktop Firefox"] },
                  },
                  {
                      name: "webkit",
                      testMatch: /.*\.ui\.spec\.ts/,
                      use: { ...devices["Desktop Safari"] },
                  },
              ]
            : []),
    ],

    webServer: process.env.E2E_BASE_URL
        ? undefined
        : {
              command: `pnpm start -p ${port}`,
              url: `${baseURL}/api/health/ready`,
              reuseExistingServer: !process.env.CI,
              timeout: 60_000,
              env: {
                  BETTER_AUTH_URL: baseURL,
                  // Tests create their own accounts and sign in repeatedly from one address.
                  AUTH_DISABLE_SIGN_UP: "false",
                  AUTH_RATE_LIMIT: "false",
              },
          },
});
