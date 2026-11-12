import {
    bigint,
    boolean,
    date,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { parseColumnFormValue, parseForm } from "../src/lib/dashboard/common/form-parser";

// Ad-hoc table covering column kinds the demo table does not use.
const t = pgTable("parser_fixture", {
    flag: boolean(),
    big: bigint({ mode: "bigint" }),
    day: date({ mode: "date" }),
    stamp: timestamp({ mode: "date" }),
    list: text().array(),
    nums: integer().array(),
    json: jsonb(),
    count: integer(),
    name: text(),
});

describe("parseColumnFormValue — column kinds", () => {
    it("parses booleans strictly", () => {
        expect(parseColumnFormValue("true", t.flag)).toBe(true);
        expect(parseColumnFormValue("false", t.flag)).toBe(false);
        expect(() => parseColumnFormValue("yes", t.flag)).toThrow(/a boolean/);
        expect(() => parseColumnFormValue("TRUE", t.flag)).toThrow(/a boolean/);
    });

    it("parses 64-bit integers and rejects out-of-range or malformed values", () => {
        expect(parseColumnFormValue("9223372036854775807", t.big)).toBe(9223372036854775807n);
        expect(parseColumnFormValue("-9223372036854775808", t.big)).toBe(-9223372036854775808n);
        expect(() => parseColumnFormValue("9223372036854775808", t.big)).toThrow(/64-bit/);
        expect(() => parseColumnFormValue("12.5", t.big)).toThrow(/64-bit/);
        expect(() => parseColumnFormValue("1".repeat(25), t.big)).toThrow(/64-bit/);
    });

    it("parses dates and rejects invalid ones", () => {
        expect(parseColumnFormValue("2026-11-12T10:00:00Z", t.stamp)).toEqual(
            new Date("2026-11-12T10:00:00Z"),
        );
        expect(() => parseColumnFormValue("not a date", t.day)).toThrow(/valid date/);
    });

    it("parses arrays from JSON and rejects non-arrays", () => {
        expect(parseColumnFormValue('["a","b"]', t.list)).toEqual(["a", "b"]);
        expect(() => parseColumnFormValue('{"a":1}', t.list)).toThrow(/JSON array/);
        expect(() => parseColumnFormValue("[oops", t.list)).toThrow(/JSON array/);
        expect(parseColumnFormValue("[1,2,3]", t.nums)).toEqual([1, 2, 3]);
    });

    it("parses JSON columns and integers with surrounding whitespace", () => {
        expect(parseColumnFormValue(' {"a": 1} ', t.json)).toEqual({ a: 1 });
        expect(parseColumnFormValue(" 7 ", t.count)).toBe(7);
        expect(() => parseColumnFormValue("1e3", t.count)).toThrow(/an integer/);
    });

    it("keeps text exactly as typed and maps empty strings to null", () => {
        expect(parseColumnFormValue("  spaced  ", t.name)).toBe("  spaced  ");
        expect(parseColumnFormValue("", t.name)).toBeNull();
    });

    it("refuses file uploads", () => {
        const file = new File(["x"], "x.txt");
        expect(() => parseColumnFormValue(file, t.name)).toThrow(/File values are not supported/);
    });
});

describe("parseForm — safety", () => {
    const form = (entries: Record<string, string>) => {
        const fd = new FormData();
        for (const [k, v] of Object.entries(entries)) fd.set(k, v);
        return fd;
    };

    it("rejects unknown fields instead of ignoring them", () => {
        expect(() => parseForm(form({ multiline_field: "x", is_admin: "true" }), "tables")).toThrow(
            /Unknown update field: is_admin/,
        );
    });

    it("never lets prototype-pollution style keys through", () => {
        for (const key of ["constructor", "prototype"]) {
            const fd = new FormData();
            fd.set(key, "x");
            expect(() => parseForm(fd, "tables")).toThrow(/Unknown update field/);
        }

        // zod's record guard drops a literal __proto__ key; either outcome is safe as long as
        // nothing reaches the parsed row or Object.prototype.
        const fd = new FormData();
        fd.set("__proto__", "x");
        let parsed: Record<string, unknown> | undefined;
        try {
            parsed = parseForm(fd, "tables");
        } catch {
            parsed = undefined;
        }
        expect(parsed === undefined || Object.keys(parsed).length === 0).toBe(true);
        expect(({} as Record<string, unknown>).x).toBeUndefined();
        expect(Object.getPrototypeOf({})).toBe(Object.prototype);
    });

    it("does not allow the same column twice via different spellings", () => {
        // Property names equal column names in this schema, so duplicates surface as one key.
        const fd = new FormData();
        fd.append("text_field", "a");
        fd.append("text_field", "b");
        expect(() => parseForm(fd, "tables")).toThrow(/Duplicate update field/);
    });
});
