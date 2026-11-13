import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryChain } from "./helpers/db";

const mocks = vi.hoisted(() => ({
    db: { select: vi.fn() },
    requireSession: vi.fn(),
    cacheDbRequest: vi.fn(),
}));

vi.mock("@/db", () => ({ default: mocks.db }));
vi.mock("@/lib/dal/require-session", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/lib/cache", () => ({ cacheDbRequest: mocks.cacheDbRequest }));
vi.mock("@/utils/stdlog", () => ({
    default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

import { getRows } from "../src/lib/dashboard/common/get";

beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue({ user: { id: "u" } });
});

describe("getRows", () => {
    it("rejects anonymous callers before the cache or the database is touched", async () => {
        mocks.requireSession.mockRejectedValue(new Error("Authentication is required"));

        await expect(getRows("tables", "id")).rejects.toThrow("Authentication is required");

        expect(mocks.cacheDbRequest).not.toHaveBeenCalled();
        expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("reads through the cache for authenticated callers", async () => {
        mocks.db.select.mockReturnValue(queryChain([]));

        await expect(getRows("tables", "id")).resolves.toEqual({ ok: true, data: [] });
        expect(mocks.cacheDbRequest).toHaveBeenCalledWith(["tables"]);
    });

    it("reports an unknown id column as an error result", async () => {
        await expect(getRows("tables", "nope")).resolves.toEqual({
            ok: false,
            error: "Unknown id column",
        });
        expect(mocks.db.select).not.toHaveBeenCalled();
    });
});
