import { describe, expect, it } from "vitest";

import { tables } from "../src/db/schema";
import { parseColumnFormValue, parseForm } from "../src/lib/dashboard/common/form-parser";

describe("parseColumnFormValue", () => {
    it("converts empty form values to null", () => {
        expect(parseColumnFormValue("", tables.multiline_field)).toBeNull();
    });

    it("parses integer columns as safe numbers", () => {
        expect(parseColumnFormValue("42", tables.number_field)).toBe(42);
        expect(() => parseColumnFormValue("4.2", tables.number_field)).toThrow(/an integer/);
        expect(() => parseColumnFormValue("9007199254740992", tables.number_field)).toThrow(
            /safe integer/,
        );
    });

    it("parses JSONB values without losing numeric option types", () => {
        expect(parseColumnFormValue("17", tables.radio_group_field)).toBe(17);
        expect(parseColumnFormValue('["read", "write"]', tables.radio_group_field)).toEqual([
            "read",
            "write",
        ]);
        expect(() => parseColumnFormValue("not-json", tables.radio_group_field)).toThrow(
            /valid JSON/,
        );
    });

    it("keeps whitespace in ordinary text fields", () => {
        expect(parseColumnFormValue("  keep whitespace  ", tables.multiline_field)).toBe(
            "  keep whitespace  ",
        );
    });
});

describe("parseForm", () => {
    it("maps canonical fields and parses their Drizzle types", () => {
        const formData = new FormData();
        formData.set("multiline_field", "hello");
        formData.set("number_field", "12");

        expect(parseForm(formData, "tables")).toEqual({
            multiline_field: "hello",
            number_field: 12,
        });
    });

    it("rejects duplicate form field names", () => {
        const formData = new FormData();
        formData.append("multiline_field", "first");
        formData.append("multiline_field", "second");

        expect(() => parseForm(formData, "tables")).toThrow(/Duplicate update field/);
    });

    it("rejects non-positive conventional IDs", () => {
        const formData = new FormData();
        formData.set("id", "0");
        formData.set("multiline_field", "hello");

        expect(() => parseForm(formData, "tables")).toThrow(/positive integer/);
    });
});
