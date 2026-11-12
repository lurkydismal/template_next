import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

async function signIn(page: Page) {
    if (!email || !password) throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD are required");

    await page.goto("/auth/login");
    await page.locator("#signin-email").fill(email);
    await page.locator("#signin-password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.goto("/dashboard/tables");
    await expect(page.getByRole("grid")).toBeVisible();
}

test("anonymous users cannot access the protected dashboard or live stream", async ({ page }) => {
    await page.goto("/dashboard/tables");
    await expect(page).toHaveURL(/\/auth\/(register|login)/);

    const streamResponse = await page.request.get("/api/dashboard/changes");
    expect(streamResponse.status()).toBe(401);
});

test.describe("authenticated dashboard workflows", () => {
    test.skip(
        !email || !password,
        "Set E2E_USER_EMAIL and E2E_USER_PASSWORD for authenticated E2E tests",
    );

    test("validates table input, creates and edits a row, and broadcasts live updates", async ({
        page,
        context,
    }) => {
        await signIn(page);

        const observer = await context.newPage();
        const streamResponsePromise = observer.waitForResponse((response) =>
            response.url().includes("/api/dashboard/changes"),
        );
        await observer.goto("/dashboard/tables");
        await expect(observer.getByRole("grid")).toBeVisible();
        expect((await streamResponsePromise).status()).toBe(200);

        const createdValue = `e2e-create-${Date.now()}`;
        await page.keyboard.press("Control+m");
        const dialog = page.getByRole("dialog").first();
        const input = page.locator("#multiline_field-text");
        await expect(dialog).toBeVisible();

        // Empty required values must keep the dialog open and show the field error.
        await input.fill("");
        await page.keyboard.press("Escape");
        await expect(page.getByText("Multiline is required")).toBeVisible();
        await expect(dialog).toBeVisible();

        // Closing a valid create dialog commits the insert and emits an SSE update.
        await input.fill(createdValue);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(observer.getByText(createdValue)).toBeVisible();

        const updatedValue = `e2e-update-${Date.now()}`;
        await observer.getByText(createdValue).click();
        const editDialog = observer.getByRole("dialog").first();
        const editInput = observer.locator("#multiline_field-text");
        await expect(editDialog).toBeVisible();
        await editInput.fill(updatedValue);
        await observer.keyboard.press("Escape");
        await expect(editDialog).toBeHidden();

        // The originating tab and the second open tab both receive the row change.
        await expect(page.getByText(updatedValue)).toBeVisible();
        await expect(observer.getByText(updatedValue)).toBeVisible();

        await observer.close();
    });
});
