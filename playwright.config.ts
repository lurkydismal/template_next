import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const usesExternalServer = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? "github" : "list",
    timeout: 30_000,
    expect: { timeout: 8_000 },
    use: {
        baseURL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    ...(usesExternalServer
        ? {}
        : {
              webServer: {
                  command: "pnpm dev",
                  url: baseURL,
                  reuseExistingServer: !process.env.CI,
                  timeout: 120_000,
              },
          }),
});
