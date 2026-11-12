import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/lib/dashboard/common/update_create", () => ({ save: mocks.save }));

import { createAction } from "../src/lib/dashboard/common/create";
import { updateAction } from "../src/lib/dashboard/common/update";

beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockResolvedValue({ ok: true, data: undefined });
});

describe("createAction", () => {
    it("delegates to save() as an insert", async () => {
        await createAction("tables", { multiline_field: "x" });
        expect(mocks.save).toHaveBeenCalledWith(
            "tables",
            { multiline_field: "x" },
            { isUpdate: false },
        );
    });
});

describe("updateAction", () => {
    it("parses FormData with column metadata before calling save() as an update", async () => {
        const fd = new FormData();
        fd.set("id", "5");
        fd.set("number_field", "42");

        await updateAction("tables", "id", fd);

        expect(mocks.save).toHaveBeenCalledWith(
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
