"use server";

import type { AnyColumn, SQL } from "drizzle-orm";

import { and, eq, getColumns } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-orm/zod";

import type { ActionResult, DbTarget } from "@/lib/types";

import db from "@/db";
import { updateDbCacheTags } from "@/lib/cache";
import { emitDashboardChange } from "@/lib/dashboard/common/change-events";
import { getSession } from "@/lib/safe/auth";
import { parseRawTarget } from "@/lib/types";
import { getUserId, requestUserId } from "@/lib/user";
import { toCamelCase } from "@/utils/stdfunc";
import log from "@/utils/stdlog";
import { mutationInputSchema } from "@/utils/validate/schemas";

type MutationRow = Record<string, unknown>;

type SaveOptions = {
    isUpdate?: boolean;
    /** Drizzle property name or physical SQL column name. */
    idColumnName?: string | string[];
};

type ResolvedColumn = {
    propertyName: string;
    column: AnyColumn;
};

type ColumnRuntimeMetadata = {
    readonly dataType?: string;
    readonly columnType?: string;
};

/** PostgreSQL integer columns represented as JavaScript numbers by Drizzle. */
const INTEGER_COLUMN_TYPES: ReadonlySet<string> = new Set([
    "PgSmallInt",
    "PgInteger",
    "PgSerial",
    "PgSmallSerial",
    "PgBigInt53",
    "PgBigSerial53",
]);

/**
 * SQL type fallback for Drizzle versions where a column's runtime dataType
 * metadata is absent or differs from the canonical ColumnDataType value.
 */
const INTEGER_SQL_TYPES: ReadonlySet<string> = new Set([
    "smallint",
    "integer",
    "int",
    "int2",
    "int4",
    "smallserial",
    "serial",
]);

function toDbMutation(parsedRow: MutationRow, actorId: string, isUpdate: boolean): MutationRow {
    return {
        ...parsedRow,
        ...(isUpdate ? {} : { author_id: actorId }),
        last_editor_id: actorId,
    };
}

function normalizeIdColumns(idColumnName: string | string[]): string[] {
    return Array.isArray(idColumnName) ? idColumnName : [idColumnName];
}

function resolveColumn(
    columns: Record<string, AnyColumn | undefined>,
    requestedName: string,
): ResolvedColumn | undefined {
    const directColumn = columns[requestedName];
    if (directColumn) {
        return { propertyName: requestedName, column: directColumn };
    }

    // Prefer an exact physical-name match before trying a camelCase alias.
    for (const [propertyName, column] of Object.entries(columns)) {
        if (column?.name === requestedName) {
            return { propertyName, column };
        }
    }

    const camelCaseName = toCamelCase(requestedName);
    const camelCaseColumn = columns[camelCaseName];
    if (camelCaseColumn) {
        return { propertyName: camelCaseName, column: camelCaseColumn };
    }

    return undefined;
}

function getPrimaryKeyValue(
    parsedInput: MutationRow,
    { propertyName, column }: ResolvedColumn,
): unknown {
    const possibleKeys = [propertyName, column.name, toCamelCase(column.name)];

    for (const key of possibleKeys) {
        if (Object.prototype.hasOwnProperty.call(parsedInput, key)) {
            return parsedInput[key];
        }
    }

    return undefined;
}

function buildPrimaryKeyWhereClause(parsedInput: MutationRow, idColumns: ResolvedColumn[]): SQL {
    if (idColumns.length === 0) {
        throw new Error("Missing primary key columns for update");
    }

    const predicates = idColumns.map((resolvedColumn) => {
        const { propertyName, column } = resolvedColumn;
        const value = getPrimaryKeyValue(parsedInput, resolvedColumn);

        if (value === undefined || value === null) {
            throw new Error(`Missing primary key value for ${propertyName}`);
        }

        return eq(column, value);
    });

    return predicates.length === 1 ? predicates[0]! : and(...predicates)!;
}

function removeIdColumnsFromMutation(row: MutationRow, idColumns: ResolvedColumn[]): MutationRow {
    const mutation = { ...row };

    for (const { propertyName, column } of idColumns) {
        delete mutation[propertyName];
        delete mutation[column.name];
        delete mutation[toCamelCase(column.name)];
    }

    return mutation;
}

/** Saves a validated insert or update and emits the dashboard invalidation event. */
export async function save(
    rawTarget: DbTarget,
    input: MutationRow,
    opts: SaveOptions = {},
): Promise<ActionResult> {
    const table = parseRawTarget(rawTarget);
    const parsedInput = (await mutationInputSchema.parseAsync(input)) as MutationRow;
    const isUpdate = opts.isUpdate === true;
    const schema = isUpdate ? createUpdateSchema(table) : createInsertSchema(table);

    const sessionUser = (await getSession()).data?.user;
    const actor = sessionUser?.name;
    if (!actor) {
        throw new Error("Missing authenticated user");
    }

    const actorId = await getUserId(requestUserId(actor));
    if (!actorId) {
        throw new Error("Missing authenticated user");
    }

    const row = await schema.parseAsync(toDbMutation(parsedInput, actorId, isUpdate));

    if (isUpdate) {
        if (!opts.idColumnName) {
            throw new Error("Missing id column for update");
        }

        const columns = getColumns(table) as Record<string, AnyColumn | undefined>;
        const requestedIdColumns = normalizeIdColumns(opts.idColumnName);
        const idColumns: ResolvedColumn[] = [];
        const resolvedNames = new Set<string>();

        for (const requestedName of requestedIdColumns) {
            const resolvedColumn = resolveColumn(columns, requestedName);
            if (!resolvedColumn) {
                return { ok: false, error: `Unknown id column: ${requestedName}` };
            }

            if (resolvedNames.has(resolvedColumn.propertyName)) {
                return {
                    ok: false,
                    error: `Duplicate id column: ${resolvedColumn.propertyName}`,
                };
            }

            resolvedNames.add(resolvedColumn.propertyName);
            idColumns.push(resolvedColumn);
        }

        const whereClause = buildPrimaryKeyWhereClause(parsedInput, idColumns);
        const mutationRow = removeIdColumnsFromMutation(row, idColumns);

        // returning verifies the update atomically
        const updatedRows = await db
            .update(table)
            .set(mutationRow)
            .where(whereClause)
            .returning()
            .execute();

        if (updatedRows.length !== 1) {
            throw new Error("Update target no longer exists or the key is not unique");
        }
    } else {
        await db
            .insert(table)
            .values(row as any)
            .execute();
    }

    // Cache invalidation runs only after the database mutation succeeds.
    try {
        updateDbCacheTags([rawTarget]);
    } catch (cacheError) {
        log.error("Cache revalidation error:", cacheError);
    }

    await emitDashboardChange(rawTarget);

    return { ok: true, data: undefined };
}

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

/**
 * Parses a single FormData value using the target column's runtime metadata.
 * Runtime metadata is read from the server-side Drizzle column, never supplied
 * by the client.
 */
function parseColumnFormValue(value: FormDataEntryValue, column: AnyColumn): unknown {
    if (typeof value !== "string") {
        throw new Error(`File values are not supported for column ${column.name}`);
    }

    if (value === "") return null;

    // AnyColumn's static metadata can be narrower than the runtime metadata
    // exposed by Drizzle. Read it through a separate structural view instead of
    // intersecting it with AnyColumn.
    const metadata = column as unknown as ColumnRuntimeMetadata;
    const dataType = metadata.dataType;
    const columnType = metadata.columnType ?? "";
    const sqlType = column.getSQLType().trim().toLowerCase().replace(/\s+/g, " ");
    const normalizedValue = value.trim();

    const isInteger = INTEGER_COLUMN_TYPES.has(columnType) || INTEGER_SQL_TYPES.has(sqlType);

    // Do not silently return numeric form values as strings when Drizzle's
    // runtime dataType differs across RC versions.
    if (dataType === "number" || isInteger) {
        const numberPattern = isInteger
            ? /^[+-]?\d+$/
            : /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

        if (!numberPattern.test(normalizedValue)) {
            return invalidFormValue(column, isInteger ? "an integer" : "a number");
        }

        const parsed = Number(normalizedValue);
        if (!Number.isFinite(parsed) || (isInteger && !Number.isSafeInteger(parsed))) {
            return invalidFormValue(column, isInteger ? "a safe integer" : "a finite number");
        }

        return parsed;
    }

    switch (dataType) {
        case "bigint": {
            if (normalizedValue.length > 20 || !/^[+-]?\d+$/.test(normalizedValue)) {
                return invalidFormValue(column, "a 64-bit integer");
            }

            try {
                const parsed = BigInt(normalizedValue);
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

        case "boolean":
            if (normalizedValue === "true") return true;
            if (normalizedValue === "false") return false;
            return invalidFormValue(column, "a boolean");

        case "date": {
            const parsed = new Date(normalizedValue);
            if (Number.isNaN(parsed.getTime())) {
                return invalidFormValue(column, "a valid date");
            }
            return parsed;
        }

        case "json":
            return parseJsonValue(normalizedValue, column, "valid JSON");

        case "array": {
            const parsed = parseJsonValue(normalizedValue, column, "a JSON array");
            if (!Array.isArray(parsed)) {
                return invalidFormValue(column, "a JSON array");
            }
            return parsed;
        }

        default:
            // Keep the original string intact; whitespace may be meaningful.
            return value;
    }
}

/**
 * Parses form fields using the target table's Drizzle schema. Both Drizzle
 * property names and physical SQL column names are accepted; unknown and
 * duplicate fields are rejected.
 */
export async function parseForm(formData: FormData, rawTarget: DbTarget): Promise<MutationRow> {
    const table = parseRawTarget(rawTarget);
    const columns = getColumns(table) as Record<string, AnyColumn | undefined>;
    const columnsByInputName = new Map<string, ResolvedColumn>();

    const registerInputName = (inputName: string, resolvedColumn: ResolvedColumn) => {
        const existing = columnsByInputName.get(inputName);
        if (existing && existing.propertyName !== resolvedColumn.propertyName) {
            throw new Error(`Ambiguous form field name: ${inputName}`);
        }
        columnsByInputName.set(inputName, resolvedColumn);
    };

    for (const [propertyName, column] of Object.entries(columns)) {
        if (!column) continue;

        const resolvedColumn = { propertyName, column };
        registerInputName(propertyName, resolvedColumn);
        registerInputName(column.name, resolvedColumn);
    }

    const formEntries = [...formData.entries()];
    const seenInputNames = new Set<string>();

    for (const [inputName] of formEntries) {
        if (seenInputNames.has(inputName)) {
            throw new Error(`Duplicate update field: ${inputName}`);
        }
        seenInputNames.add(inputName);
    }

    const validatedEntries = mutationInputSchema.parse(Object.fromEntries(formEntries)) as Record<
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
        const invalidId =
            (typeof parsedValue === "number" &&
                (!Number.isSafeInteger(parsedValue) || parsedValue <= 0)) ||
            (typeof parsedValue === "bigint" && parsedValue <= 0n);

        // Preserve the positive-integer validation for the conventional `id` key.
        if (propertyName === "id" && invalidId) {
            throw new Error("Invalid id value: expected a positive integer");
        }

        parsedEntries[propertyName] = parsedValue;
    }

    return parsedEntries;
}
