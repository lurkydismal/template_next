import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sessionFor } from "./helpers/db";

const mocks = vi.hoisted(() => ({ guardRoute: vi.fn() }));

vi.mock("@/lib/dal/require-session", () => ({ guardRoute: mocks.guardRoute }));
vi.mock("@/utils/stdlog", () => ({
    default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

import { GET } from "../src/app/api/dashboard/changes/route";
import {
    emitDashboardChange,
    emitNotificationEvent,
} from "../src/lib/dashboard/common/change-events";

const registry = () => globalThis.__dashboardListeners!;
const decoder = new TextDecoder();

/** Reads chunks until `predicate` matches the accumulated text (or the stream ends). */
async function readUntil(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    predicate: (text: string) => boolean,
): Promise<string> {
    let text = "";
    while (!predicate(text)) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value);
    }
    return text;
}

function open(controller = new AbortController()) {
    const request = new Request("https://app.example.test/api/dashboard/changes", {
        signal: controller.signal,
    });
    return { controller, request };
}

beforeEach(() => {
    mocks.guardRoute.mockResolvedValue(sessionFor());
});

afterEach(() => {
    vi.useRealTimers();
});

describe("GET /api/dashboard/changes", () => {
    it("rejects anonymous clients without opening a stream or subscribing", async () => {
        mocks.guardRoute.mockResolvedValue(Response.json({ error: "no" }, { status: 401 }));
        const before = registry().size;

        const response = await GET(open().request);

        expect(response.status).toBe(401);
        expect(response.headers.get("content-type")).not.toContain("text/event-stream");
        expect(registry().size).toBe(before);
    });

    it("streams SSE with proxy-friendly headers and a connected frame", async () => {
        const { controller, request } = open();
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/event-stream");
        expect(response.headers.get("cache-control")).toBe("no-cache, no-transform");
        expect(response.headers.get("x-accel-buffering")).toBe("no");

        const reader = response.body!.getReader();
        const text = await readUntil(reader, (t) => t.includes('"connected"'));
        expect(text).toContain("retry: 1000");
        expect(text).toContain('data: {"type":"connected"}');

        controller.abort();
    });

    it("forwards dashboard-change and notification events as data frames", async () => {
        const { controller, request } = open();
        const reader = (await GET(request)).body!.getReader();
        await readUntil(reader, (t) => t.includes('"connected"'));

        await emitDashboardChange("tables");
        await emitNotificationEvent({
            event: "notification",
            type: "success",
            message: "Saved",
            notificationId: 9,
            occurredAt: "2026-11-12T10:00:00.000Z",
        });

        const text = await readUntil(reader, (t) => t.includes('"notification"'));
        const frames = text
            .split("\n\n")
            .filter((frame) => frame.startsWith("data: "))
            .map((frame) => JSON.parse(frame.slice("data: ".length)));

        expect(frames[0]).toMatchObject({ event: "dashboard-change", target: "tables" });
        expect(frames[1]).toMatchObject({
            event: "notification",
            message: "Saved",
            notificationId: 9,
        });

        controller.abort();
    });

    it("fans out to several concurrent clients", async () => {
        const first = open();
        const second = open();
        const r1 = (await GET(first.request)).body!.getReader();
        const r2 = (await GET(second.request)).body!.getReader();
        await readUntil(r1, (t) => t.includes('"connected"'));
        await readUntil(r2, (t) => t.includes('"connected"'));

        await emitDashboardChange("tables");

        expect(await readUntil(r1, (t) => t.includes("dashboard-change"))).toContain(
            "dashboard-change",
        );
        expect(await readUntil(r2, (t) => t.includes("dashboard-change"))).toContain(
            "dashboard-change",
        );

        first.controller.abort();
        second.controller.abort();
    });

    it("sends keep-alive comments so idle proxies do not drop the stream", async () => {
        vi.useFakeTimers();
        const { controller, request } = open();
        const reader = (await GET(request)).body!.getReader();
        await readUntil(reader, (t) => t.includes('"connected"'));

        await vi.advanceTimersByTimeAsync(20_000);

        expect(await readUntil(reader, (t) => t.includes("keep-alive"))).toContain(": keep-alive");
        controller.abort();
    });

    it("releases its subscription and timer when the client disconnects", async () => {
        vi.useFakeTimers();
        const before = registry().size;
        const { controller, request } = open();
        const reader = (await GET(request)).body!.getReader();
        await readUntil(reader, (t) => t.includes('"connected"'));
        expect(registry().size).toBe(before + 1);

        controller.abort();
        await vi.advanceTimersByTimeAsync(0);

        expect(registry().size).toBe(before);
        expect(vi.getTimerCount()).toBe(0);
    });

    it("releases its subscription when the consumer cancels the stream", async () => {
        const before = registry().size;
        const { request } = open();
        const response = await GET(request);
        const reader = response.body!.getReader();
        await readUntil(reader, (t) => t.includes('"connected"'));

        await reader.cancel();

        expect(registry().size).toBe(before);
    });

    it("does not subscribe when the request is already aborted", async () => {
        const before = registry().size;
        const controller = new AbortController();
        controller.abort();

        const response = await GET(open(controller).request);
        await response.body!.getReader().read();

        expect(registry().size).toBe(before);
    });
});
