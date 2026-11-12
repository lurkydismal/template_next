import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), connection: vi.fn(async () => undefined) }));

vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/db", () => ({ pool: { query: mocks.query } }));
vi.mock("@/utils/stdlog", () => ({
    default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

import { GET as live } from "../src/app/api/health/live/route";
import { GET as ready } from "../src/app/api/health/ready/route";
import { checkReadiness } from "../src/lib/health";

const healthy = { rows: [{ has_user: true, has_tables: true, has_audit_trigger: true }] };

beforeEach(() => vi.clearAllMocks());

describe("checkReadiness", () => {
    it("is ready when the schema, tables and audit trigger exist", async () => {
        const pool = { query: vi.fn().mockResolvedValue(healthy) };
        await expect(checkReadiness(pool as never)).resolves.toEqual({ ok: true });
    });

    it("reports a database failure when the query rejects", async () => {
        const pool = { query: vi.fn().mockRejectedValue(new Error("ECONNREFUSED 10.0.0.5:5432")) };
        await expect(checkReadiness(pool as never)).resolves.toEqual({
            ok: false,
            reason: "database",
        });
    });

    it("reports a database failure when the query hangs past the timeout", async () => {
        const pool = { query: vi.fn(() => new Promise(() => undefined)) };
        await expect(checkReadiness(pool as never, 20)).resolves.toEqual({
            ok: false,
            reason: "database",
        });
    });

    it.each([
        ["user table missing", { has_user: false, has_tables: true, has_audit_trigger: true }],
        ["dashboard table missing", { has_user: true, has_tables: false, has_audit_trigger: true }],
        ["audit trigger missing", { has_user: true, has_tables: true, has_audit_trigger: false }],
    ])("reports a schema problem when the %s", async (_name, row) => {
        const pool = { query: vi.fn().mockResolvedValue({ rows: [row] }) };
        await expect(checkReadiness(pool as never)).resolves.toEqual({
            ok: false,
            reason: "schema",
        });
    });

    it("treats an empty result as a schema problem", async () => {
        const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
        await expect(checkReadiness(pool as never)).resolves.toEqual({
            ok: false,
            reason: "schema",
        });
    });
});

describe("GET /api/health/live", () => {
    it("answers 200 without touching the database and is never prerendered", async () => {
        const response = await live();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: "ok" });
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(mocks.connection).toHaveBeenCalled();
        expect(mocks.query).not.toHaveBeenCalled();
    });
});

describe("GET /api/health/ready", () => {
    it("answers 200 when ready", async () => {
        mocks.query.mockResolvedValue(healthy);

        const response = await ready();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: "ok" });
        expect(mocks.connection).toHaveBeenCalled();
    });

    it("answers 503 without leaking connection details when the database is down", async () => {
        mocks.query.mockRejectedValue(new Error("password authentication failed for user app"));

        const response = await ready();

        expect(response.status).toBe(503);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(await response.json()).toEqual({ status: "unavailable" });
    });

    it("answers 503 when migrations were not applied", async () => {
        mocks.query.mockResolvedValue({
            rows: [{ has_user: false, has_tables: false, has_audit_trigger: false }],
        });
        expect((await ready()).status).toBe(503);
    });
});
