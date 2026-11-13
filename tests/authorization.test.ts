import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sessionFor } from "./helpers/db";

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    headers: vi.fn(async () => new Headers({ cookie: "a=b" })),
    getRows: vi.fn(),
    createAction: vi.fn(),
    updateAction: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/auth", () => ({ default: { api: { getSession: mocks.getSession } } }));
vi.mock("@/lib/dashboard/common/get", () => ({ getRows: mocks.getRows }));
vi.mock("@/lib/dashboard/common/create", () => ({ createAction: mocks.createAction }));
vi.mock("@/lib/dashboard/common/update", () => ({ updateAction: mocks.updateAction }));

import { guardRoute, requireSession, UnauthorizedError } from "../src/lib/dal/require-session";
import {
    createTargetRowAction,
    getTargetRowsAction,
    updateTargetRowAction,
} from "../src/lib/dashboard/common/function";
import { DbTargetSchema, parseRawTarget, TABLES } from "../src/lib/types";

beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers({ cookie: "a=b" }));
});

const asRequest = () =>
    new Request("https://app.example.test/api/x", { headers: { cookie: "a=b" } });

describe("session guards", () => {
    it("requireSession passes the request headers to Better Auth", async () => {
        mocks.getSession.mockResolvedValue(sessionFor());
        await requireSession();
        expect(mocks.getSession).toHaveBeenCalledWith({ headers: expect.any(Headers) });
    });

    it("requireSession throws UnauthorizedError without a session", async () => {
        mocks.getSession.mockResolvedValue(null);
        await expect(requireSession()).rejects.toBeInstanceOf(UnauthorizedError);
        await expect(requireSession()).rejects.toThrow("Authentication is required");
    });

    it.each([
        ["a session without a user", {}],
        ["a user without an id", { user: { name: "x" } }],
        ["a blank user id", { user: { id: "   " } }],
        ["a non-string user id", { user: { id: 7 } }],
    ])("requireSession fails closed for %s", async (_name, session) => {
        mocks.getSession.mockResolvedValue(session);
        await expect(requireSession()).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("requireSession returns the session when present", async () => {
        const session = sessionFor();
        mocks.getSession.mockResolvedValue(session);
        await expect(requireSession()).resolves.toBe(session);
    });

    it("guardRoute reads the session from the request, not from Next's request scope", async () => {
        mocks.getSession.mockResolvedValue(sessionFor());
        const request = asRequest();

        await guardRoute(request);

        expect(mocks.getSession).toHaveBeenCalledWith({ headers: request.headers });
        expect(mocks.headers).not.toHaveBeenCalled();
    });

    it("guardRoute returns an opaque, uncacheable 401 when unauthenticated", async () => {
        mocks.getSession.mockResolvedValue(null);
        const response = await guardRoute(asRequest());

        expect(response).toBeInstanceOf(Response);
        const res = response as Response;
        expect(res.status).toBe(401);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(await res.json()).toEqual({ error: "Authentication is required" });
    });

    it("guardRoute rejects a malformed session", async () => {
        mocks.getSession.mockResolvedValue({ user: { id: "" } });
        expect(((await guardRoute(asRequest())) as Response).status).toBe(401);
    });

    it("guardRoute fails closed (rejects) when the auth backend itself errors", async () => {
        mocks.getSession.mockRejectedValue(new Error("db down"));
        await expect(guardRoute(asRequest())).rejects.toThrow("db down");
    });

    it("guardRoute returns the session when authenticated", async () => {
        const session = sessionFor();
        mocks.getSession.mockResolvedValue(session);
        await expect(guardRoute(asRequest())).resolves.toBe(session);
    });
});

describe("dashboard server actions for signed-in users", () => {
    beforeEach(() => mocks.getSession.mockResolvedValue(sessionFor()));

    it("returns rows on success and raises on failure", async () => {
        mocks.getRows.mockResolvedValueOnce({ ok: true, data: [{ id: 1 }] });
        await expect(getTargetRowsAction("tables", "id")).resolves.toEqual([{ id: 1 }]);

        mocks.getRows.mockResolvedValueOnce({ ok: false, error: "Get error" });
        await expect(getTargetRowsAction("tables", "id")).rejects.toThrow(/Failed to get rows/);

        mocks.getRows.mockResolvedValueOnce({ ok: true, data: undefined });
        await expect(getTargetRowsAction("tables", "id")).rejects.toThrow(/no data/);
    });

    it("surfaces create/update failures as errors", async () => {
        mocks.createAction.mockResolvedValueOnce({ ok: false, error: "bad" });
        await expect(createTargetRowAction("tables", {})).rejects.toThrow(/Failed to create row/);

        mocks.updateAction.mockResolvedValueOnce({ ok: false, error: "bad" });
        await expect(updateTargetRowAction("tables", "id", new FormData())).rejects.toThrow(
            /Failed to update row/,
        );

        mocks.createAction.mockResolvedValueOnce({ ok: true, data: undefined });
        await expect(createTargetRowAction("tables", {})).resolves.toBeUndefined();
    });
});

describe("dashboard target allowlist", () => {
    it("exposes only the dashboard table", () => {
        expect(Object.keys(TABLES)).toEqual(["tables"]);
        expect(DbTargetSchema.options).toEqual(["tables"]);
        expect(parseRawTarget("tables")).toBe(TABLES.tables);
    });

    it.each([
        "user",
        "session",
        "account",
        "verification",
        "notifications",
        "recordChanges",
        "__proto__",
        "",
    ])("rejects %j", (target) => {
        expect(() => parseRawTarget(target as never)).toThrow();
    });
});

describe("proxy (page protection)", () => {
    async function runProxy(signUpDisabled: boolean, session: unknown) {
        vi.resetModules();
        vi.doMock("@/lib/auth/config", () => ({ authConfig: { signUpDisabled } }));
        vi.doMock("@/lib/auth", () => ({
            default: { api: { getSession: vi.fn().mockResolvedValue(session) } },
        }));
        const { proxy } = await import("../src/proxy");
        return proxy(new NextRequest("https://app.example.test/dashboard/tables"));
    }

    it("lets signed-in users through", async () => {
        const response = await runProxy(true, sessionFor());
        expect(response.headers.get("location")).toBeNull();
        expect(response.status).toBe(200);
    });

    it("sends anonymous users to login when sign-up is disabled", async () => {
        const response = await runProxy(true, null);
        expect(response.status).toBe(307);
        expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/login");
    });

    it("sends anonymous users to registration when sign-up is open", async () => {
        const response = await runProxy(false, null);
        expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/register");
    });
});
