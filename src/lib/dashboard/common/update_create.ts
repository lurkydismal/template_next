"use server";

import type { AnyColumn, SQL } from "drizzle-orm";

import { and, eq, getColumns } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-orm/zod";

import type { ActionResult, DbTarget } from "@/lib/types";

import db from "@/db";
import { getCurrentSession, requireAuthenticatedUser } from "@/lib/auth/session";
import { updateDbCacheTags } from "@/lib/cache";
import { emitDashboardChange } from "@/lib/dashboard/common/change-events";
import { parseForm } from "@/lib/dashboard/common/form-parser";
import { parseRawTarget } from "@/lib/types";
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

type ColumnResolution = { ok: true; columns: ResolvedColumn[] } | { ok: false; error: string };

const SERVER_MANAGED_FIELDS = new Set(["author_id", "last_editor_id", "created_at", "updated_at"]);

function toDbMutation(parsedRow: MutationRow, actorId: string, isUpdate: boolean): MutationRow {
    // Audit metadata and generated IDs are controlled by the server, never by form data.
    const mutableFields = Object.fromEntries(
        Object.entries(parsedRow).filter(
            ([key]) => !SERVER_MANAGED_FIELDS.has(key) && (isUpdate || key !== "id"),
        ),
    );

    return {
        ...mutableFields,
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

    for (const [propertyName, column] of Object.entries(columns)) {
        if (column?.name === requestedName) {
            return { propertyName, column };
        }
    }

    const camelCaseName = toCamelCase(requestedName);
    const camelCaseColumn = columns[camelCaseName];
    return camelCaseColumn ? { propertyName: camelCaseName, column: camelCaseColumn } : undefined;
}

function resolveIdColumns(
    columns: Record<string, AnyColumn | undefined>,
    idColumnName: string | string[],
): ColumnResolution {
    const resolvedColumns: ResolvedColumn[] = [];
    const resolvedNames = new Set<string>();

    for (const requestedName of normalizeIdColumns(idColumnName)) {
        const column = resolveColumn(columns, requestedName);
        if (!column) {
            return { ok: false, error: `Unknown id column: ${requestedName}` };
        }

        if (resolvedNames.has(column.propertyName)) {
            return { ok: false, error: `Duplicate id column: ${column.propertyName}` };
        }

        resolvedNames.add(column.propertyName);
        resolvedColumns.push(column);
    }

    return { ok: true, columns: resolvedColumns };
}

function getPrimaryKeyValue(parsedInput: MutationRow, resolved: ResolvedColumn): unknown {
    const possibleKeys = [
        resolved.propertyName,
        resolved.column.name,
        toCamelCase(resolved.column.name),
    ];

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
        const value = getPrimaryKeyValue(parsedInput, resolvedColumn);
        if (value === undefined || value === null) {
            throw new Error(`Missing primary key value for ${resolvedColumn.propertyName}`);
        }
        return eq(resolvedColumn.column, value);
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

async function getActorId(): Promise<string> {
    const session = await getCurrentSession();
    return requireAuthenticatedUser(session).id;
}

async function insertMutation(table: ReturnType<typeof parseRawTarget>, row: MutationRow) {
    await db
        .insert(table)
        .values(row as never)
        .execute();
}

async function updateMutation(
    table: ReturnType<typeof parseRawTarget>,
    parsedInput: MutationRow,
    row: MutationRow,
    idColumnName: string | string[],
): Promise<ActionResult> {
    const columns = getColumns(table) as Record<string, AnyColumn | undefined>;
    const resolution = resolveIdColumns(columns, idColumnName);
    if (!resolution.ok) return resolution;

    const whereClause = buildPrimaryKeyWhereClause(parsedInput, resolution.columns);
    const mutationRow = removeIdColumnsFromMutation(row, resolution.columns);
    const updatedRows = await db
        .update(table)
        .set(mutationRow)
        .where(whereClause)
        .returning()
        .execute();

    if (updatedRows.length !== 1) {
        throw new Error("Update target no longer exists or the key is not unique");
    }

    return { ok: true, data: undefined };
}

async function buildMutationRow(
    table: ReturnType<typeof parseRawTarget>,
    input: MutationRow,
    actorId: string,
    isUpdate: boolean,
): Promise<{ parsedInput: MutationRow; row: MutationRow }> {
    const parsedInput = (await mutationInputSchema.parseAsync(input)) as MutationRow;
    const schema = isUpdate ? createUpdateSchema(table) : createInsertSchema(table);
    const row = await schema.parseAsync(toDbMutation(parsedInput, actorId, isUpdate));
    return { parsedInput, row: row as MutationRow };
}

async function persistMutation(
    table: ReturnType<typeof parseRawTarget>,
    parsedInput: MutationRow,
    row: MutationRow,
    opts: SaveOptions,
    isUpdate: boolean,
): Promise<ActionResult> {
    if (!isUpdate) {
        await insertMutation(table, row);
        return { ok: true, data: undefined };
    }

    if (!opts.idColumnName) {
        throw new Error("Missing id column for update");
    }

    return updateMutation(table, parsedInput, row, opts.idColumnName);
}

async function invalidateDashboard(rawTarget: DbTarget): Promise<void> {
    try {
        updateDbCacheTags([rawTarget]);
    } catch (cacheError) {
        log.error("Cache revalidation error:", cacheError);
    }

    await emitDashboardChange(rawTarget);
}

/** Saves a validated insert or update and emits the dashboard invalidation event. */
export async function save(
    rawTarget: DbTarget,
    input: MutationRow | FormData,
    opts: SaveOptions = {},
): Promise<ActionResult> {
    // Authorize before resolving user-controlled targets or parsing payloads.
    const actorId = await getActorId();
    const table = parseRawTarget(rawTarget);
    const isUpdate = opts.isUpdate === true;

    // Parse browser FormData only after authorization; create actions pass typed objects.
    if (input instanceof FormData && !isUpdate) {
        throw new Error("FormData is only supported for row updates");
    }

    const mutationInput = input instanceof FormData ? parseForm(input, rawTarget) : input;
    const { parsedInput, row } = await buildMutationRow(table, mutationInput, actorId, isUpdate);
    const result = await persistMutation(table, parsedInput, row, opts, isUpdate);

    if (!result.ok) return result;

    await invalidateDashboard(rawTarget);
    return { ok: true, data: undefined };
}
