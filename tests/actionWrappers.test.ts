import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ save: vi.fn(), requireSession: vi.fn() }));
vi.mock("@/lib/dashboard/common/save-core", () => ({ saveAsActor: mocks.save }));
vi.mock("@/lib/dal/require-session", () => ({ requireSession: mocks.requireSession }));

import { createAction } from "../src/lib/dashboard/common/create";
import { updateAction } from "../src/lib/dashboard/common/update";

beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockResolvedValue({ ok: true, data: undefined });
    mocks.requireSession.mockResolvedValue({ user: { id: "u" } });
});

describe("createAction", () => {
    it("passes the session user to the save core as an insert", async () => {
        await createAction("tables", { multiline_field: "x" });
        expect(mocks.save).toHaveBeenCalledWith(
            "u",
            "tables",
            { multiline_field: "x" },
            { isUpdate: false },
        );
    });
});

describe("updateAction", () => {
    it("parses FormData with column metadata before saving as an update", async () => {
        const fd = new FormData();
        fd.set("id", "5");
        fd.set("number_field", "42");

        await updateAction("tables", "id", fd);

        expect(mocks.save).toHaveBeenCalledWith(
            "u",
            "tables",
            { id: 5, number_field: 42 },
            { isUpdate: true, idColumnName: "id" },
        );
    });

    it("rejects malformed input before reaching save()", async () => {
        const fd = new FormData();
        fd.set("id", "-1");
        await expect(updateAction("tables", "id", fd)).rejects.toThrow(/positive integer/);

        const bad = new FormData();
        bad.set("number_field", "4.2");
        await expect(updateAction("tables", "id", bad)).rejects.toThrow(/an integer/);
        expect(mocks.save).not.toHaveBeenCalled();
    });
});

describe("authorization comes first", () => {
    beforeEach(() => {
        mocks.requireSession.mockRejectedValue(new Error("Authentication is required"));
    });

    it("createAction rejects anonymous callers without saving", async () => {
        await expect(createAction("tables", { multiline_field: "x" })).rejects.toThrow(
            "Authentication is required",
        );
        expect(mocks.save).not.toHaveBeenCalled();
    });

    it("updateAction rejects anonymous callers before parsing untrusted FormData", async () => {
        const fd = new FormData();
        fd.set("unknown_field", "not allowed");

        await expect(updateAction("tables", "id", fd)).rejects.toThrow(
            "Authentication is required",
        );
        expect(mocks.save).not.toHaveBeenCalled();
    });
});
