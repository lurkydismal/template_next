/**
 * Routes must authenticate from the Request they are given: they are exercised (and may be
 * invoked) outside Next's request scope, where `headers()` throws. Server actions authorize
 * first, before resolving targets or parsing untrusted input.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryChain, sessionFor } from "./helpers/db";

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}));

// Deliberately NOT mocking next/headers: calling it here would throw, like in production tests.
vi.mock("@/lib/auth", () => ({ default: { api: { getSession: mocks.getSession } } }));
vi.mock("@/db", () => ({ default: mocks.db }));
vi.mock("@/lib/cache", () => ({ cacheDbRequest: vi.fn(), updateDbCacheTags: vi.fn() }));
vi.mock("@/utils/stdlog", () => ({
    default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

import { GET as changes } from "../src/app/api/dashboard/changes/route";
import { GET, PATCH, POST } from "../src/app/api/notifications/route";

const req = (method: string, body?: unknown) =>
    new Request("https://app.example.test/api/notifications", {
        method,
        headers: { cookie: "session=abc", "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(null);
});

describe("route handlers outside a Next request scope", () => {
    it.each([
        ["GET", () => GET(req("GET"))],
        ["POST", () => POST(req("POST", { message: "x" }))],
        ["PATCH", () => PATCH(req("PATCH", { ids: [1] }))],
        ["SSE", () => changes(req("GET"))],
    ])("%s answers 401 for anonymous callers using the request's own headers", async (_n, call) => {
        const response = await call();

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Authentication is required" });
        expect(mocks.getSession).toHaveBeenCalledWith({ headers: expect.any(Headers) });
        expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("serves an authenticated GET", async () => {
        mocks.getSession.mockResolvedValue(sessionFor());
        mocks.db.select
            .mockReturnValueOnce(queryChain([{ id: 1 }]))
            .mockReturnValueOnce(queryChain([{ total: 1 }]));

        const response = await GET(req("GET"));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ rows: [{ id: 1 }], unreadCount: 1 });
    });

    it("opens an event stream for an authenticated client", async () => {
        mocks.getSession.mockResolvedValue(sessionFor());
        const controller = new AbortController();

        const response = await changes(
            new Request("https://app.example.test/api/dashboard/changes", {
                signal: controller.signal,
            }),
        );

        expect(response.headers.get("content-type")).toContain("text/event-stream");
        controller.abort();
    });
});

describe("table actions authorize first", () => {
    beforeEach(() => {
        vi.doMock("next/headers", () => ({ headers: async () => new Headers() }));
        vi.resetModules();
    });

    it("save() rejects before resolving the target or parsing the payload", async () => {
        const { save } = await import("../src/lib/dashboard/common/update_create");
        await expect(save("not-a-dashboard-target" as never, null as never)).rejects.toThrow(
            "Authentication is required",
        );
        expect(mocks.db.insert).not.toHaveBeenCalled();
    });

    it("updateAction() rejects before parsing untrusted FormData", async () => {
        const { updateAction } = await import("../src/lib/dashboard/common/update");
        const formData = new FormData();
        formData.set("unknown_field", "not allowed");
        await expect(updateAction("tables", "id", formData)).rejects.toThrow(
            "Authentication is required",
        );
    });

    it("getRows() rejects anonymous callers before the database is queried", async () => {
        const { getRows } = await import("../src/lib/dashboard/common/get");
        await expect(getRows("tables", "id")).rejects.toThrow("Authentication is required");
        expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("creates drop a client-chosen generated id and server-owned columns", async () => {
        mocks.getSession.mockResolvedValue(sessionFor("actor-1"));
        const insert = queryChain(undefined);
        mocks.db.insert.mockReturnValue(insert);
        const { save } = await import("../src/lib/dashboard/common/update_create");

        await save("tables", {
            id: 900,
            multiline_field: "x",
            created_at: "2001-01-01T00:00:00Z",
            updated_at: "2001-01-01T00:00:00Z",
        });

        const values = insert.values.mock.calls[0]![0] as Record<string, unknown>;
        expect(values).toMatchObject({ author_id: "actor-1", last_editor_id: "actor-1" });
        expect(values).not.toHaveProperty("id");
        expect(values.created_at).toBeUndefined();
        expect(values.updated_at).toBeUndefined();
    });
});
