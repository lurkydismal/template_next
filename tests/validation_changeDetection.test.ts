import { describe, expect, it, vi } from "vitest";

import {
    rowHasChanges,
    rowHasId,
} from "../src/components/TableDataGrid/RowDialog/Content/changeDetection";
import { getFieldRules } from "../src/components/TableDataGrid/RowDialog/Content/validation";
import type { FieldConfig } from "../src/components/TableDataGrid/RowDialog/types";
import type { UseFormReturn } from "react-hook-form";

type Row = {
    id: string | null;
    amount?: number;
    uuid?: string;
    hex?: string;
    inet?: string;
    custom?: string;
};

type Field = FieldConfig<Row, Row>;

/**
 * Creates a tiny form stub that matches only getValues() required by getFieldRules.
 */
function createFormStub(allValues: Record<string, unknown>) {
    return {
        getValues: () => allValues,
    } as UseFormReturn<Record<string, unknown>>;
}

/**
 * Extracts a callable validate function from react-hook-form rule objects.
 */
function getSingleValidate(
    rules: ReturnType<typeof getFieldRules>,
):
    | ((
        value: unknown,
        formValues: Record<string, unknown>,
    ) => Promise<unknown> | unknown)
    | undefined {
    const candidate = rules.validate;
    if (typeof candidate === "function") return candidate;
    return undefined;
}

/**
 * Runs a single-field validate function. The formValues parameter ({}) satisfies
 * the react-hook-form type signature but is unused; the actual form state comes
 * from the mocked form.getValues().
 */
function runSingleValidate(
    rules: ReturnType<typeof getFieldRules>,
    value: unknown,
) {
    return getSingleValidate(rules)?.(value, {});
}

describe("row change detection", () => {
    it("rowHasChanges ignores readOnly unless interconnected and detects trimmed differences", () => {
        const fields: Field[] = [
            { key: "custom", type: "custom", label: "Custom", readOnly: true },
            { key: "uuid", type: "uuid", label: "UUID" },
        ];

        expect(
            rowHasChanges(
                { id: "1", custom: "A", uuid: " value " },
                { custom: "B", uuid: "value" },
                fields,
            ),
        ).toBe(false);

        expect(
            rowHasChanges(
                { id: "1", custom: "A", uuid: "x" },
                { custom: "A", uuid: "y" },
                fields,
            ),
        ).toBe(true);
    });

    it("rowHasChanges uses custom isChanged function", () => {
        const fields: Field[] = [
            {
                key: "amount",
                type: "number",
                label: "Amount",
                isChanged: (oldValue, newValue) =>
                    Number(oldValue) !== Number(newValue),
            },
        ];

        expect(
            rowHasChanges({ id: "1", amount: 1 }, { amount: 1 }, fields),
        ).toBe(false);
        expect(
            rowHasChanges({ id: "1", amount: 1 }, { amount: 2 }, fields),
        ).toBe(true);
    });

    it("rowHasId validates null/non-null id values", () => {
        expect(rowHasId({ id: null }, "id")).toBe(false);
        expect(rowHasId({ id: "abc" }, "id")).toBe(true);
    });
});

describe("getFieldRules validation", () => {
    it("returns empty rules for readOnly fields", () => {
        const rules = getFieldRules(
            { key: "uuid", type: "uuid", label: "UUID", readOnly: true },
            [],
            createFormStub({}),
            { id: "1" },
            {},
        );
        expect(rules).toEqual({});
    });

    it("validates built-in number/uuid/hex/inet types and required-group constraints", async () => {
        const baseRow = { id: "1" } as Row;
        const fields = [
            { key: "amount", label: "Amount", type: "number", min: 1, max: 10 },
            { key: "uuid", label: "UUID", type: "uuid" },
            { key: "hex", label: "Hex", type: "hex" },
            { key: "inet", label: "INET", type: "inet", inetAllowPort: true },
            {
                key: "custom",
                label: "Custom",
                requiredGroup: "g1",
                requiredGroupMin: 1,
            },
            {
                key: "amount",
                label: "Amount 2",
                requiredGroup: "g1",
                requiredGroupMin: 1,
            },
        ] as Field[];

        const form = createFormStub({ custom: "", amount: "" });

        const numberRules = getFieldRules(fields[0]!, fields, form, baseRow, {});
        await expect(runSingleValidate(numberRules, "2")).resolves.toBe(true);
        await expect(runSingleValidate(numberRules, "abc")).resolves.toBe(
            "Enter a valid number",
        );
        await expect(runSingleValidate(numberRules, "0")).resolves.toBe(
            "Amount must be greater than or equal to 1",
        );
        await expect(runSingleValidate(numberRules, "11")).resolves.toBe(
            "Amount must be less than or equal to 10",
        );

        const uuidRules = getFieldRules(fields[1]!, fields, form, baseRow, {});
        await expect(runSingleValidate(uuidRules, "not-uuid")).resolves.toBe(
            "Enter a valid UUID value",
        );

        const hexRules = getFieldRules(fields[2]!, fields, form, baseRow, {});
        await expect(runSingleValidate(hexRules, "0x1af")).resolves.toBe(true);

        const inetRules = getFieldRules(fields[3]!, fields, form, baseRow, {});
        await expect(
            runSingleValidate(inetRules, "127.0.0.1:3000"),
        ).resolves.toBe(true);
        await expect(
            runSingleValidate(inetRules, "[2001:db8::1]:443"),
        ).resolves.toBe(true);
        await expect(
            runSingleValidate(inetRules, "999.0.0.1"),
        ).resolves.toContain("Enter a valid IPv4/IPv6 value");

        const groupRules = getFieldRules(fields[4]!, fields, form, baseRow, {});
        await expect(runSingleValidate(groupRules, "")).resolves.toContain(
            "Enter at least 1 of:",
        );
    });

    it("validates table lookup and custom validate hooks", async () => {
        const tableLookup = vi.fn(async (value: unknown) => value === "ok");
        const customValidate = vi.fn(async (value: unknown) =>
            value === "x" ? "bad value" : true,
        );

        const field: Field = {
            key: "custom",
            label: "Custom",
            type: "table-lookup",
            lookup: tableLookup,
            tableLookupErrorMessage: "lookup failed",
            validate: customValidate,
            required: true,
        };

        const form = createFormStub({ custom: "ok" });
        const rules = getFieldRules(field, [field], form, { id: "1" }, {});

        expect(rules.required).toBe("Custom is required");
        await expect(runSingleValidate(rules, "ok")).resolves.toBe(true);
        await expect(runSingleValidate(rules, "bad")).resolves.toBe(
            "lookup failed",
        );
        await expect(runSingleValidate(rules, "x")).resolves.toBe(
            "lookup failed",
        );
        expect(tableLookup).toHaveBeenCalled();
    });
});
