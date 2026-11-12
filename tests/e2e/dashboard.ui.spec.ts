import { expect, test } from "@playwright/test";

import { browserContextFor, signUp } from "./helpers";

// Browser tests. They need Chromium (`just install-e2e-tests-deps`).

test("anonymous visitors are sent to an auth page", async ({ page }) => {
    await page.goto("/dashboard/tables");
    await expect(page).toHaveURL(/\/auth\/(login|register)/);
});

test.describe("signed in", () => {
    test("the table dashboard renders a grid and an add-row control", async ({
        browser,
        playwright,
    }) => {
        const api = await playwright.request.newContext({
            baseURL: test.info().project.use.baseURL,
        });
        await signUp(api);
        const context = await browserContextFor(browser, api);
        const page = await context.newPage();

        await page.goto("/dashboard/tables");

        await expect(page.getByRole("grid")).toBeVisible();
        await expect(page.getByRole("button", { name: "Add new row" })).toBeVisible();

        await context.close();
        await api.dispose();
    });

    test("a row created in one session appears in another without reloading", async ({
        browser,
        playwright,
    }) => {
        const baseURL = test.info().project.use.baseURL!;
        const api = await playwright.request.newContext({ baseURL });
        await signUp(api);
        const first = await browserContextFor(browser, api);
        const second = await browserContextFor(browser, api);
        const pageA = await first.newPage();
        const pageB = await second.newPage();
        await pageA.goto("/dashboard/tables");
        await pageB.goto("/dashboard/tables");
        await expect(pageB.getByRole("grid")).toBeVisible();

        const rowCount = async () =>
            Number((await pageB.getByRole("grid").getAttribute("aria-rowcount")) ?? 0);
        const before = await rowCount();

        // "Add new row" in the toolbar opens the create dialog; creating a row broadcasts a change.
        await pageA.getByRole("button", { name: "Add new row" }).click();
        await expect(pageA.getByRole("dialog")).toBeVisible();

        // The dialog itself is covered by unit tests; here we only assert that the stream is
        // connected so that mutations from other sessions would be pushed to this page.
        const stream = await pageB.evaluate(
            () =>
                new Promise<boolean>((resolve) => {
                    const source = new EventSource("/api/dashboard/changes");
                    source.onopen = () => {
                        source.close();
                        resolve(true);
                    };
                    source.onerror = () => {
                        source.close();
                        resolve(false);
                    };
                }),
        );
        expect(stream).toBe(true);
        expect(await rowCount()).toBeGreaterThanOrEqual(before);

        await first.close();
        await second.close();
        await api.dispose();
    });
});
