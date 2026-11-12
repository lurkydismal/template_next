import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    insert: vi.fn(),
    insertValues: vi.fn(),
    insertExecute: vi.fn(),
    update: vi.fn(),
    updateSet: vi.fn(),
    updateWhere: vi.fn(),
    updateReturning: vi.fn(),
    updateExecute: vi.fn(),
    select: vi.fn(),
    cacheTags: vi.fn(),
    cacheRequest: vi.fn(),
    emitChange: vi.fn(),
    logError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    default: { api: { getSession: mocks.getSession } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/db", () => ({
    default: {
        insert: mocks.insert,
        update: mocks.update,
        select: mocks.select,
    },
}));
vi.mock("@/lib/cache", () => ({
    updateDbCacheTags: mocks.cacheTags,
    cacheDbRequest: mocks.cacheRequest,
}));
vi.mock("@/lib/dashboard/common/change-events", () => ({
    emitDashboardChange: mocks.emitChange,
}));
vi.mock("@/utils/stdlog", () => ({
    default: { debug: vi.fn(), error: mocks.logError, trace: vi.fn(), info: vi.fn() },
}));

import { getRows } from "@/lib/dashboard/common/get";
import { updateAction } from "@/lib/dashboard/common/update";
import { save } from "@/lib/dashboard/common/update_create";

function configureInsert() {
    mocks.insertExecute.mockResolvedValue(undefined);
    mocks.insertValues.mockReturnValue({ execute: mocks.insertExecute });
    mocks.insert.mockReturnValue({ values: mocks.insertValues });
}

function configureUpdate(rows: unknown[]) {
    mocks.updateExecute.mockResolvedValue(rows);
    mocks.updateReturning.mockReturnValue({ execute: mocks.updateExecute });
    mocks.updateWhere.mockReturnValue({ returning: mocks.updateReturning });
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
    mocks.update.mockReturnValue({ set: mocks.updateSet });
}

describe("dashboard table actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSession.mockResolvedValue({
            user: { id: "actor-1", name: "Test User" },
            session: { id: "session-1" },
        });
        configureInsert();
        configureUpdate([{ id: 1 }]);
        mocks.cacheTags.mockReturnValue(undefined);
        mocks.emitChange.mockResolvedValue(undefined);
    });

    it("creates rows with server-controlled audit metadata", async () => {
        await expect(
            save("tables", {
                id: 900,
                multiline_field: "new row",
                author_id: "forged-author",
                last_editor_id: "forged-editor",
                created_at: new Date("2000-01-01T00:00:00.000Z"),
                updated_at: new Date("2000-01-01T00:00:00.000Z"),
            }),
        ).resolves.toEqual({ ok: true, data: undefined });

        const values = mocks.insertValues.mock.calls[0]?.[0] as Record<string, unknown>;
        expect(values).toMatchObject({
            multiline_field: "new row",
            author_id: "actor-1",
            last_editor_id: "actor-1",
        });
        expect(values).not.toHaveProperty("id");
        expect(values.created_at).toBeUndefined();
        expect(values.updated_at).toBeUndefined();
        expect(mocks.cacheTags).toHaveBeenCalledWith(["tables"]);
        expect(mocks.emitChange).toHaveBeenCalledWith("tables");
    });

    it("updates only mutable fields and never changes authorship metadata", async () => {
        await expect(
            save(
                "tables",
                {
                    id: 1,
                    multiline_field: "updated row",
                    author_id: "forged-author",
                    last_editor_id: "forged-editor",
                    created_at: new Date("2000-01-01T00:00:00.000Z"),
                },
                { isUpdate: true, idColumnName: "id" },
            ),
        ).resolves.toEqual({ ok: true, data: undefined });

        const values = mocks.updateSet.mock.calls[0]?.[0] as Record<string, unknown>;
        expect(values).toMatchObject({
            multiline_field: "updated row",
            last_editor_id: "actor-1",
        });
        expect(values).not.toHaveProperty("id");
        expect(values).not.toHaveProperty("author_id");
        expect(values).not.toHaveProperty("created_at");
        expect(mocks.emitChange).toHaveBeenCalledWith("tables");
    });

    it("updates rows from FormData after authorization and preserves server metadata", async () => {
        const formData = new FormData();
        formData.set("id", "1");
        formData.set("multiline_field", "updated through FormData");
        formData.set("author_id", "forged-author");
        formData.set("last_editor_id", "forged-editor");

        await expect(updateAction("tables", "id", formData)).resolves.toEqual({
            ok: true,
            data: undefined,
        });

        const values = mocks.updateSet.mock.calls[0]?.[0] as Record<string, unknown>;
        expect(values).toMatchObject({
            multiline_field: "updated through FormData",
            last_editor_id: "actor-1",
        });
        expect(values).not.toHaveProperty("author_id");
        expect(mocks.getSession).toHaveBeenCalledOnce();
        expect(mocks.emitChange).toHaveBeenCalledWith("tables");
    });

    it("rejects unauthenticated mutations before touching the database", async () => {
        mocks.getSession.mockResolvedValue(null);

        await expect(save("tables", { multiline_field: "attempt" })).rejects.toThrow(
            "Authentication is required",
        );
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.emitChange).not.toHaveBeenCalled();
    });

    it("authorizes direct saves before resolving targets or parsing payloads", async () => {
        mocks.getSession.mockResolvedValue(null);

        await expect(save("not-a-dashboard-target" as never, null as never)).rejects.toThrow(
            "Authentication is required",
        );
        expect(mocks.getSession).toHaveBeenCalledOnce();
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it("authorizes update actions before parsing untrusted FormData", async () => {
        mocks.getSession.mockResolvedValue(null);
        const formData = new FormData();
        formData.set("unknown_field", "not allowed");

        await expect(updateAction("tables", "id", formData)).rejects.toThrow(
            "Authentication is required",
        );
        expect(mocks.getSession).toHaveBeenCalledOnce();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it("rejects schema-invalid inserts without persisting or broadcasting", async () => {
        await expect(
            save("tables", { text_field: "missing required multiline" }),
        ).rejects.toThrow();
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.emitChange).not.toHaveBeenCalled();
    });

    it("does not broadcast when an update target is missing", async () => {
        configureUpdate([]);

        await expect(
            save(
                "tables",
                { id: 999, multiline_field: "updated" },
                {
                    isUpdate: true,
                    idColumnName: "id",
                },
            ),
        ).rejects.toThrow(/no longer exists/);
        expect(mocks.emitChange).not.toHaveBeenCalled();
    });

    it("rejects unknown update key columns without issuing SQL", async () => {
        await expect(
            save(
                "tables",
                { id: 1, multiline_field: "updated" },
                {
                    isUpdate: true,
                    idColumnName: "not_a_column",
                },
            ),
        ).resolves.toEqual({ ok: false, error: "Unknown id column: not_a_column" });
        expect(mocks.update).not.toHaveBeenCalled();
        expect(mocks.emitChange).not.toHaveBeenCalled();
    });

    it("requires authentication before serving cached table rows", async () => {
        mocks.getSession.mockResolvedValue(null);

        await expect(getRows("tables", "id")).rejects.toThrow("Authentication is required");
        expect(mocks.select).not.toHaveBeenCalled();
    });
});
