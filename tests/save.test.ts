import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryChain, sessionFor } from "./helpers/db";

const mocks = vi.hoisted(() => ({
    db: { insert: vi.fn(), update: vi.fn() },
    requireSession: vi.fn(),
    updateDbCacheTags: vi.fn(),
    emitDashboardChange: vi.fn(),
}));

vi.mock("@/db", () => ({ default: mocks.db }));
vi.mock("@/lib/dal/require-session", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/lib/cache", () => ({ updateDbCacheTags: mocks.updateDbCacheTags }));
vi.mock("@/lib/dashboard/common/change-events", () => ({
    emitDashboardChange: mocks.emitDashboardChange,
}));
vi.mock("@/utils/stdlog", () => ({
    default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

import { save } from "../src/lib/dashboard/common/update_create";

let insertChain: ReturnType<typeof queryChain>;
let updateChain: ReturnType<typeof queryChain>;

beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSession.mockResolvedValue(sessionFor("actor-1"));
    insertChain = queryChain(undefined);
    updateChain = queryChain([{ id: 5 }]);
    mocks.db.insert.mockReturnValue(insertChain);
    mocks.db.update.mockReturnValue(updateChain);
});

describe("save — create", () => {
    it("inserts with author and last editor taken from the session", async () => {
        const result = await save("tables", { multiline_field: "hello", text_field: "t" });

        expect(result).toEqual({ ok: true, data: undefined });
        expect(insertChain.values).toHaveBeenCalledWith(
            expect.objectContaining({
                multiline_field: "hello",
                text_field: "t",
                author_id: "actor-1",
                last_editor_id: "actor-1",
            }),
        );
    });

    it("never lets the client choose a generated primary key", async () => {
        await save("tables", { id: 900, multiline_field: "hello" });

        const values = insertChain.values.mock.calls[0]![0] as Record<string, unknown>;
        expect(values).not.toHaveProperty("id");
    });

    it("discards client-forged authorship and timestamps", async () => {
        await save("tables", {
            multiline_field: "hello",
            author_id: "someone-else",
            last_editor_id: "someone-else",
            created_at: "2001-01-01T00:00:00Z",
        });

        const values = insertChain.values.mock.calls[0]![0] as Record<string, unknown>;
        expect(values.author_id).toBe("actor-1");
        expect(values.last_editor_id).toBe("actor-1");
        expect(values).not.toHaveProperty("created_at");
    });

    it("invalidates the cache tag and broadcasts a change event after success", async () => {
        await save("tables", { multiline_field: "hello" });

        expect(mocks.updateDbCacheTags).toHaveBeenCalledWith(["tables"]);
        expect(mocks.emitDashboardChange).toHaveBeenCalledWith("tables");
    });

    it("still broadcasts when cache invalidation fails", async () => {
        mocks.updateDbCacheTags.mockImplementation(() => {
            throw new Error("cache unavailable");
        });

        await expect(save("tables", { multiline_field: "hello" })).resolves.toEqual({
            ok: true,
            data: undefined,
        });
        expect(mocks.emitDashboardChange).toHaveBeenCalledWith("tables");
    });

    it("rejects input that violates the table schema without touching the database", async () => {
        await expect(
            save("tables", { text_field: "missing required multiline" }),
        ).rejects.toThrow();
        await expect(
            save("tables", { multiline_field: "x", number_field: "not a number" }),
        ).rejects.toThrow();

        expect(mocks.db.insert).not.toHaveBeenCalled();
        expect(mocks.emitDashboardChange).not.toHaveBeenCalled();
    });

    it("propagates database failures and does not broadcast", async () => {
        mocks.db.insert.mockReturnValue(queryChain(new Error("connection lost")));

        await expect(save("tables", { multiline_field: "hello" })).rejects.toThrow(
            "connection lost",
        );
        expect(mocks.updateDbCacheTags).not.toHaveBeenCalled();
        expect(mocks.emitDashboardChange).not.toHaveBeenCalled();
    });
});

describe("save — update", () => {
    const update = { isUpdate: true, idColumnName: "id" } as const;

    it("updates by primary key, stamps only the last editor, and strips the key from the SET list", async () => {
        const result = await save("tables", { id: 5, multiline_field: "changed" }, update);

        expect(result).toEqual({ ok: true, data: undefined });
        const set = updateChain.set.mock.calls[0]![0] as Record<string, unknown>;
        expect(set).toMatchObject({ multiline_field: "changed", last_editor_id: "actor-1" });
        expect(set).not.toHaveProperty("id");
        expect(set).not.toHaveProperty("author_id");
        expect(updateChain.where).toHaveBeenCalledTimes(1);
        expect(mocks.emitDashboardChange).toHaveBeenCalledWith("tables");
    });

    it("cannot be used to reassign authorship", async () => {
        await save("tables", { id: 5, author_id: "attacker", authorId: "attacker" }, update);

        const set = updateChain.set.mock.calls[0]![0] as Record<string, unknown>;
        expect(set).not.toHaveProperty("author_id");
        expect(set).not.toHaveProperty("authorId");
    });

    it("fails and does not broadcast when the row no longer exists", async () => {
        mocks.db.update.mockReturnValue(queryChain([]));

        await expect(save("tables", { id: 999, multiline_field: "x" }, update)).rejects.toThrow(
            /no longer exists/,
        );
        expect(mocks.emitDashboardChange).not.toHaveBeenCalled();
    });

    it("rejects a missing primary key value and a missing id column", async () => {
        await expect(save("tables", { multiline_field: "x" }, update)).rejects.toThrow(
            /Missing primary key value/,
        );
        await expect(save("tables", { id: 5 }, { isUpdate: true })).rejects.toThrow(
            /Missing id column/,
        );
        expect(mocks.db.update).not.toHaveBeenCalled();
    });

    it("returns an error result for an unknown id column", async () => {
        await expect(
            save("tables", { id: 5 }, { isUpdate: true, idColumnName: "nope" }),
        ).resolves.toEqual({ ok: false, error: "Unknown id column: nope" });
        expect(mocks.emitDashboardChange).not.toHaveBeenCalled();
    });

    it("rejects duplicate id columns", async () => {
        await expect(
            save("tables", { id: 5 }, { isUpdate: true, idColumnName: ["id", "id"] }),
        ).resolves.toEqual({ ok: false, error: "Duplicate id column: id" });
    });
});

describe("save — authorization and targets", () => {
    it("fails before any parsing or database access when unauthenticated", async () => {
        mocks.requireSession.mockRejectedValue(new Error("Unauthenticated"));

        await expect(save("tables", { multiline_field: "x" })).rejects.toThrow("Unauthenticated");
        expect(mocks.db.insert).not.toHaveBeenCalled();
        expect(mocks.db.update).not.toHaveBeenCalled();
        expect(mocks.emitDashboardChange).not.toHaveBeenCalled();
    });

    it("authenticates before resolving the target or parsing the payload", async () => {
        mocks.requireSession.mockRejectedValue(new Error("Authentication is required"));

        await expect(save("not-a-target" as never, null as never)).rejects.toThrow(
            "Authentication is required",
        );
    });

    it.each(["user", "session", "account", "verification", "notifications", "recordChanges"])(
        "refuses to write to the non-dashboard table %s",
        async (target) => {
            await expect(
                save(target as never, { id: "1", name: "pwn", password: "x" }),
            ).rejects.toThrow();
            expect(mocks.db.insert).not.toHaveBeenCalled();
        },
    );
});
