import type { AnyColumn } from "drizzle-orm";

import { getColumns } from "drizzle-orm";

import type { DbTarget } from "@/lib/types";

import { parseRawTarget } from "@/lib/types";
import { mutationInputSchema } from "@/utils/validate/schemas";

type MutationRow = Record<string, unknown>;
type ResolvedColumn = {
    propertyName: string;
    column: AnyColumn;
};
type ColumnRuntimeMetadata = {
    readonly dataType?: string;
    readonly columnType?: string;
};

const INTEGER_COLUMN_TYPES: ReadonlySet<string> = new Set([
    "PgSmallInt",
    "PgInteger",
    "PgSerial",
    "PgSmallSerial",
    "PgBigInt53",
    "PgBigSerial53",
]);

const INTEGER_SQL_TYPES: ReadonlySet<string> = new Set([
    "smallint",
    "integer",
    "int",
    "int2",
    "int4",
    "smallserial",
    "serial",
]);

function invalidFormValue(column: AnyColumn, expected: string): never {
    throw new Error(`Invalid value for column ${column.name}: expected ${expected}`);
}

function parseJsonValue(value: string, column: AnyColumn, expected: string): unknown {
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return invalidFormValue(column, expected);
    }
}

function parseNumericValue(value: string, column: AnyColumn, integer: boolean): number {
    const pattern = integer ? /^[+-]?\d+$/ : /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

    if (!pattern.test(value)) {
        return invalidFormValue(column, integer ? "an integer" : "a number");
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || (integer && !Number.isSafeInteger(parsed))) {
        return invalidFormValue(column, integer ? "a safe integer" : "a finite number");
    }

    return parsed;
}

function parseBigIntValue(value: string, column: AnyColumn): bigint {
    if (value.length > 20 || !/^[+-]?\d+$/.test(value)) {
        return invalidFormValue(column, "a 64-bit integer");
    }

    try {
        const parsed = BigInt(value);
        const min = -(1n << 63n);
        const max = (1n << 63n) - 1n;
        if (parsed < min || parsed > max) {
            return invalidFormValue(column, "a 64-bit integer");
        }
        return parsed;
    } catch {
        return invalidFormValue(column, "a 64-bit integer");
    }
}

function parseBooleanValue(value: string, column: AnyColumn): boolean {
    if (value === "true") return true;
    if (value === "false") return false;
    return invalidFormValue(column, "a boolean");
}

function parseDateValue(value: string, column: AnyColumn): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return invalidFormValue(column, "a valid date");
    }
    return parsed;
}

function parseArrayValue(value: string, column: AnyColumn): unknown[] {
    const parsed = parseJsonValue(value, column, "a JSON array");
    if (!Array.isArray(parsed)) {
        return invalidFormValue(column, "a JSON array");
    }
    return parsed;
}

/**
 * Parses one FormData value using trusted, server-side Drizzle column metadata.
 * Empty values become null; untyped string fields retain their original whitespace.
 */
export function parseColumnFormValue(value: FormDataEntryValue, column: AnyColumn): unknown {
    if (typeof value !== "string") {
        throw new Error(`File values are not supported for column ${column.name}`);
    }

    if (value === "") return null;

    const metadata = column as unknown as ColumnRuntimeMetadata;
    const dataType = metadata.dataType;
    const columnType = metadata.columnType ?? "";
    const sqlType = column.getSQLType().trim().toLowerCase().replace(/\s+/g, " ");
    const normalizedValue = value.trim();
    const isInteger = INTEGER_COLUMN_TYPES.has(columnType) || INTEGER_SQL_TYPES.has(sqlType);
    const isJson = dataType === "json" || sqlType === "json" || sqlType === "jsonb";

    if (isJson) return parseJsonValue(normalizedValue, column, "valid JSON");
    if (dataType === "number" || isInteger) {
        return parseNumericValue(normalizedValue, column, isInteger);
    }

    switch (dataType) {
        case "bigint":
            return parseBigIntValue(normalizedValue, column);
        case "boolean":
            return parseBooleanValue(normalizedValue, column);
        case "date":
            return parseDateValue(normalizedValue, column);
        case "array":
            return parseArrayValue(normalizedValue, column);
        default:
            return value;
    }
}

function registerColumnInputName(
    inputNames: Map<string, ResolvedColumn>,
    inputName: string,
    resolvedColumn: ResolvedColumn,
): void {
    const existing = inputNames.get(inputName);
    if (existing && existing.propertyName !== resolvedColumn.propertyName) {
        throw new Error(`Ambiguous form field name: ${inputName}`);
    }
    inputNames.set(inputName, resolvedColumn);
}

function getColumnInputNames(columns: Record<string, AnyColumn | undefined>) {
    const inputNames = new Map<string, ResolvedColumn>();

    for (const [propertyName, column] of Object.entries(columns)) {
        if (!column) continue;

        const resolvedColumn = { propertyName, column };
        registerColumnInputName(inputNames, propertyName, resolvedColumn);
        registerColumnInputName(inputNames, column.name, resolvedColumn);
    }

    return inputNames;
}

function getUniqueFormEntries(formData: FormData): [string, FormDataEntryValue][] {
    const entries = [...formData.entries()];
    const seenNames = new Set<string>();

    for (const [name] of entries) {
        if (seenNames.has(name)) {
            throw new Error(`Duplicate update field: ${name}`);
        }
        seenNames.add(name);
    }

    return entries;
}

function hasInvalidPrimaryKey(value: unknown): boolean {
    return (
        value === null ||
        value === undefined ||
        (typeof value === "number" && (!Number.isSafeInteger(value) || value <= 0)) ||
        (typeof value === "bigint" && value <= 0n)
    );
}

/**
 * Converts a FormData payload to canonical Drizzle property names. Both property
 * names and physical SQL column names are accepted; unknown or duplicate keys fail.
 */
export function parseForm(formData: FormData, rawTarget: DbTarget): MutationRow {
    const table = parseRawTarget(rawTarget);
    const columns = getColumns(table) as Record<string, AnyColumn | undefined>;
    const columnsByInputName = getColumnInputNames(columns);
    const entries = getUniqueFormEntries(formData);
    const validatedEntries = mutationInputSchema.parse(Object.fromEntries(entries)) as Record<
        string,
        FormDataEntryValue
    >;
    const parsedEntries: MutationRow = {};

    for (const [inputName, value] of Object.entries(validatedEntries)) {
        const resolvedColumn = columnsByInputName.get(inputName);
        if (!resolvedColumn) {
            throw new Error(`Unknown update field: ${inputName}`);
        }

        const { propertyName, column } = resolvedColumn;
        if (Object.prototype.hasOwnProperty.call(parsedEntries, propertyName)) {
            throw new Error(`Duplicate update field: ${propertyName}`);
        }

        const parsedValue = parseColumnFormValue(value, column);
        if (propertyName === "id" && hasInvalidPrimaryKey(parsedValue)) {
            throw new Error("Invalid id value: expected a positive integer");
        }

        parsedEntries[propertyName] = parsedValue;
    }

    return parsedEntries;
}
