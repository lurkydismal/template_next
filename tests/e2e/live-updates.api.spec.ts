import { expect, test } from "@playwright/test";

import { cookieHeader, readSse, signUp } from "./helpers";

test.describe("live updates (SSE)", () => {
    test.beforeEach(async ({ request }) => {
        await signUp(request);
    });

    test("signed-in clients receive a connected frame with SSE headers", async ({
        request,
        baseURL,
    }) => {
        const controller = new AbortController();
        const response = await fetch(`${baseURL}/api/dashboard/changes`, {
            headers: { cookie: await cookieHeader(request) },
            signal: controller.signal,
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/event-stream");
        expect(response.headers.get("cache-control")).toContain("no-cache");

        const text = await readSse(response, (t) => t.includes('"connected"'));
        expect(text).toContain("retry: 1000");
        controller.abort();
    });

    test("a notification created over HTTP reaches an open stream", async ({
        request,
        baseURL,
    }) => {
        const controller = new AbortController();
        const stream = await fetch(`${baseURL}/api/dashboard/changes`, {
            headers: { cookie: await cookieHeader(request) },
            signal: controller.signal,
        });
        const message = `live ${Date.now()}`;

        const reading = readSse(stream, (t) => t.includes(message));
        // Give the subscription a moment to register before publishing.
        await expect
            .poll(async () => {
                const response = await request.post("/api/notifications", { data: { message } });
                return response.status();
            })
            .toBe(201);

        const text = await reading;
        const frame = text
            .split("\n\n")
            .filter((chunk) => chunk.startsWith("data: ") && chunk.includes(message))
            .map((chunk) => JSON.parse(chunk.slice(6)))[0];
        expect(frame).toMatchObject({ event: "notification", message });
        controller.abort();
    });

    test("every connected client receives the same event", async ({ request, baseURL }) => {
        const controllers = [new AbortController(), new AbortController()];
        const cookie = await cookieHeader(request);
        const streams = await Promise.all(
            controllers.map((c) =>
                fetch(`${baseURL}/api/dashboard/changes`, {
                    headers: { cookie },
                    signal: c.signal,
                }),
            ),
        );
        const message = `fanout ${Date.now()}`;
        const readers = streams.map((s) => readSse(s, (t) => t.includes(message)));

        await expect
            .poll(async () =>
                (await request.post("/api/notifications", { data: { message } })).status(),
            )
            .toBe(201);

        for (const text of await Promise.all(readers)) expect(text).toContain(message);
        controllers.forEach((c) => c.abort());
    });
});
