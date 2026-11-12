import type { UseFormReturn } from "react-hook-form";

import { describe, expect, it, vi } from "vitest";

import type { FieldConfig } from "@/components/TableDataGrid/RowDialog/types";

import { getFieldRules } from "@/components/TableDataGrid/RowDialog/rhf/validation";

type Row = Record<string, unknown>;
type Insert = Record<string, unknown>;

function makeForm(values: Record<string, unknown>) {
    return { getValues: vi.fn(() => values) } as unknown as UseFormReturn<Record<string, unknown>>;
}

async function validate(
    field: FieldConfig<Row, Insert>,
    value: unknown,
    values: Record<string, unknown> = {},
    fields: FieldConfig<Row, Insert>[] = [field],
) {
    const rules = getFieldRules(field, fields, makeForm(values), {});
    const validator = rules.validate;
    if (typeof validator !== "function") throw new Error("Expected a single field validator");
    return validator(value, values);
}

describe("row dialog field validation", () => {
    it("does not validate read-only fields", () => {
        const field: FieldConfig<Row, Insert> = {
            key: "value",
            label: "Value",
            type: "uuid",
            readOnly: true,
        };
        expect(getFieldRules(field, [field], makeForm({}), {})).toEqual({});
    });

    it("exposes required rules for required fields", () => {
        const field: FieldConfig<Row, Insert> = {
            key: "value",
            label: "Value",
            type: "text",
            required: true,
        };
        expect(getFieldRules(field, [field], makeForm({}), {}).required).toBe("Value is required");
    });

    it("validates finite numbers and configured bounds", async () => {
        const field: FieldConfig<Row, Insert> = {
            key: "count",
            label: "Count",
            type: "number",
            min: 1,
            max: 10,
        };
        expect(await validate(field, "5")).toBe(true);
        expect(await validate(field, "NaN")).toBe("Enter a valid number");
        expect(await validate(field, "0")).toBe("Count must be greater than or equal to 1");
        expect(await validate(field, "11")).toBe("Count must be less than or equal to 10");
        expect(await validate(field, "")).toBe(true);
    });

    it("validates UUID and hexadecimal formats", async () => {
        const uuid: FieldConfig<Row, Insert> = { key: "id", label: "UUID", type: "uuid" };
        const hex: FieldConfig<Row, Insert> = { key: "code", label: "Code", type: "hex" };
        expect(await validate(uuid, "123e4567-e89b-42d3-a456-426614174000")).toBe(true);
        expect(await validate(uuid, "not-a-uuid")).toBe("Enter a valid UUID value");
        expect(await validate(hex, "0xCAFE")).toBe(true);
        expect(await validate(hex, "0xZZ")).toBe("Enter a valid hex value");
    });

    it("validates IP addresses and optional host ports", async () => {
        const ip: FieldConfig<Row, Insert> = { key: "ip", label: "IP", type: "inet" };
        const endpoint: FieldConfig<Row, Insert> = {
            key: "endpoint",
            label: "Endpoint",
            type: "inet",
            inetAllowPort: true,
        };
        expect(await validate(ip, "192.0.2.10")).toBe(true);
        expect(await validate(ip, "999.1.1.1")).toBe("Enter a valid IPv4 or IPv6 value");
        expect(await validate(endpoint, "192.0.2.10:3000")).toBe(true);
        expect(await validate(endpoint, "[2001:db8::1]:443")).toBe(true);
        expect(await validate(endpoint, "192.0.2.10:70000")).toContain("For ports use");
    });

    it("validates async lookup fields and handles lookup failures", async () => {
        const lookup: FieldConfig<Row, Insert> = {
            key: "reference",
            label: "Reference",
            type: "table-lookup",
            lookup: vi.fn(async (value: unknown) => value === "known"),
            tableLookupErrorMessage: "Reference not found",
        };
        expect(await validate(lookup, "known")).toBe(true);
        expect(await validate(lookup, "missing")).toBe("Reference not found");

        const broken: FieldConfig<Row, Insert> = {
            key: "reference",
            label: "Reference",
            type: "table-lookup",
            lookup: vi.fn(async () => {
                throw new Error("database unavailable");
            }),
            tableLookupErrorMessage: "Reference could not be checked",
        };
        expect(await validate(broken, "value")).toBe("Reference could not be checked");
    });

    it("enforces grouped requirements and custom validation", async () => {
        const first: FieldConfig<Row, Insert> = {
            key: "first",
            label: "First",
            type: "text",
            requiredGroup: "contact",
            requiredGroupMin: 1,
        };
        const second: FieldConfig<Row, Insert> = {
            key: "second",
            label: "Second",
            type: "text",
            requiredGroup: "contact",
            requiredGroupMin: 1,
        };
        expect(await validate(first, "", { first: "", second: "" }, [first, second])).toBe(
            "Enter at least 1 of: First, Second",
        );
        expect(await validate(first, "", { first: "", second: "provided" }, [first, second])).toBe(
            true,
        );

        const custom: FieldConfig<Row, Insert> = {
            key: "slug",
            label: "Slug",
            type: "text",
            validate: (value) => (value === "valid" ? true : "Slug is invalid"),
        };
        expect(await validate(custom, "valid")).toBe(true);
        expect(await validate(custom, "invalid")).toBe("Slug is invalid");
    });
});
