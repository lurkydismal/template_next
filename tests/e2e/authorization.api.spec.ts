import { expect, test } from "@playwright/test";

import { newUser, signUp, PASSWORD } from "./helpers";

test.describe("anonymous access", () => {
    test("health probes are public and never cached", async ({ request }) => {
        const live = await request.get("/api/health/live");
        expect(live.status()).toBe(200);
        expect(await live.json()).toEqual({ status: "ok" });
        expect(live.headers()["cache-control"]).toBe("no-store");

        const ready = await request.get("/api/health/ready");
        expect(ready.status()).toBe(200);
        expect(await ready.json()).toEqual({ status: "ok" });
    });

    test("notifications API requires a session for every method", async ({ request }) => {
        const get = await request.get("/api/notifications");
        const post = await request.post("/api/notifications", { data: { message: "x" } });
        const patch = await request.patch("/api/notifications", { data: { ids: [1] } });

        for (const response of [get, post, patch]) {
            expect(response.status()).toBe(401);
            expect(await response.json()).toEqual({ error: "You need to sign in to do that." });
        }
    });

    test("the live-update stream requires a session", async ({ request }) => {
        const response = await request.get("/api/dashboard/changes");
        expect(response.status()).toBe(401);
        expect(response.headers()["content-type"]).not.toContain("text/event-stream");
    });

    test("protected pages redirect to an auth page", async ({ request }) => {
        const response = await request.get("/dashboard/tables", { maxRedirects: 0 });
        expect([302, 303, 307, 308]).toContain(response.status());
        expect(new URL(response.headers()["location"]!, "http://x").pathname).toMatch(
            /^\/auth\/(login|register)$/,
        );
    });

    test("a forged session cookie is rejected", async ({ request }) => {
        const response = await request.get("/api/notifications", {
            headers: { cookie: "better-auth.session_token=forged.value" },
        });
        expect(response.status()).toBe(401);
    });
});

test.describe("authentication", () => {
    test("wrong password and unknown email are both rejected", async ({ request }) => {
        const user = await signUp(request);
        await request.post("/api/auth/sign-out", { data: {} });

        const wrong = await request.post("/api/auth/sign-in/email", {
            data: { email: user.email, password: `${PASSWORD}-wrong` },
        });
        const unknown = await request.post("/api/auth/sign-in/email", {
            data: { email: newUser().email, password: PASSWORD },
        });

        expect(wrong.status()).toBe(401);
        expect(unknown.status()).toBe(401);
        expect((await request.get("/api/notifications")).status()).toBe(401);
    });

    test("signing in grants access and signing out revokes it", async ({ request }) => {
        const user = await signUp(request);
        expect((await request.get("/api/notifications")).status()).toBe(200);

        await request.post("/api/auth/sign-out", { data: {} });
        expect((await request.get("/api/notifications")).status()).toBe(401);

        const signIn = await request.post("/api/auth/sign-in/email", {
            data: { email: user.email, password: PASSWORD },
        });
        expect(signIn.ok()).toBe(true);
        expect((await request.get("/api/notifications")).status()).toBe(200);
    });

    test("short passwords are rejected at registration", async ({ request }) => {
        const response = await request.post("/api/auth/sign-up/email", {
            data: { ...newUser(), password: "short" },
        });
        expect(response.ok()).toBe(false);
    });
});

test.describe("notifications API (signed in)", () => {
    test.beforeEach(async ({ request }) => {
        await signUp(request);
    });

    test("create, list and mark read", async ({ request }) => {
        const message = `hello ${Date.now()}`;
        const created = await request.post("/api/notifications", {
            data: { message: `  ${message}  `, type: "success" },
        });
        expect(created.status()).toBe(201);
        const row = await created.json();
        expect(row).toMatchObject({ message, type: "success", is_read: false });

        const list = await (await request.get("/api/notifications")).json();
        expect(list.rows.some((r: { id: number }) => r.id === row.id)).toBe(true);
        expect(list.unreadCount).toBeGreaterThan(0);

        const patched = await request.patch("/api/notifications", { data: { ids: [row.id] } });
        expect(patched.status()).toBe(200);
        const after = await (await request.get("/api/notifications")).json();
        expect(after.rows.find((r: { id: number }) => r.id === row.id).is_read).toBe(true);
    });

    test("invalid input is rejected with 400 and a safe message", async ({ request }) => {
        const cases = [
            { data: { message: "   " }, error: "Notification message is required." },
            { data: { message: "x", type: "fatal" }, error: "Invalid notification type." },
        ];
        for (const { data, error } of cases) {
            const response = await request.post("/api/notifications", { data });
            expect(response.status()).toBe(400);
            expect(await response.json()).toEqual({ error });
        }

        const bad = await request.patch("/api/notifications", { data: { ids: [] } });
        expect(bad.status()).toBe(400);
    });
});
