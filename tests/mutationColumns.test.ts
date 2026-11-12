import { describe, expect, it } from "vitest";

import {
    stripServerOwnedColumns,
    toDbMutation,
} from "../src/lib/dashboard/common/mutation-columns";

describe("stripServerOwnedColumns", () => {
    it("removes server-owned columns in property and column-name spellings", () => {
        const input = {
            multiline_field: "keep",
            author_id: "x",
            authorId: "x",
            last_editor_id: "x",
            lastEditorId: "x",
            created_at: "2020-01-01",
            createdAt: "2020-01-01",
            updated_at: "2020-01-01",
            updatedAt: "2020-01-01",
        };
        expect(stripServerOwnedColumns(input)).toEqual({ multiline_field: "keep" });
    });

    it("does not mutate its input", () => {
        const input = { author_id: "x", a: 1 };
        stripServerOwnedColumns(input);
        expect(input).toEqual({ author_id: "x", a: 1 });
    });
});

describe("toDbMutation", () => {
    it("stamps author and last editor on create from the actor, ignoring client values", () => {
        expect(
            toDbMutation({ a: 1, author_id: "forged", last_editor_id: "forged" }, "actor", false),
        ).toEqual({
            a: 1,
            author_id: "actor",
            last_editor_id: "actor",
        });
    });

    it("only stamps last editor on update and never lets the client change authorship", () => {
        const result = toDbMutation(
            { a: 1, author_id: "forged", created_at: "2000-01-01" },
            "actor",
            true,
        );
        expect(result).toEqual({ a: 1, last_editor_id: "actor" });
        expect(result).not.toHaveProperty("author_id");
        expect(result).not.toHaveProperty("created_at");
    });
});
