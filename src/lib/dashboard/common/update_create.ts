"use server";

import { and, AnyColumn, eq, getColumns, SQL } from "drizzle-orm";

import db from "@/db";
import { getSessionData } from "@/lib/auth";
import { updateDbCacheTags } from "@/lib/cache";
import { ActionResult, DbTarget, parseRawTarget } from "@/lib/types";
import { emitDashboardChange } from "@/lib/dashboard/common/change-events";
import log from "@/utils/stdlog";
import { mutationInputSchema } from "@/utils/validate/schemas";
import {
    createInsertSchema,
    createSelectSchema,
    createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { toCamelCase } from "@/utils/stdfunc";
import { getUserId, requestUserId } from "@/lib/user";

type MutationRow = Record<string, unknown>;

type SaveOptions = {
    isUpdate?: boolean;
    idColumnName?: string | string[];
};

/**
 * Converts input into db mutation.
 */
function toDbMutation(
    parsedRow: MutationRow,
    actorId: number,
    opts: SaveOptions,
): MutationRow {
    const base = { ...parsedRow };

    if (opts.isUpdate) {
        delete base.id;
        return {
            ...base,
            last_editor_id: actorId,
        };
    }

    return {
        ...base,
        author_id: actorId,
        last_editor_id: actorId,
    };
}

/**
 * Normalizes one-or-many id columns into an array.
 */
function normalizeIdColumns(idColumnName: string | string[]): string[] {
    return Array.isArray(idColumnName) ? idColumnName : [idColumnName];
}

/**
 * Gets the value for a primary-key column from parsed input.
 */
function getPrimaryKeyValue(
    parsedInput: MutationRow,
    idColumnName: string,
): unknown {
    const camelKey = toCamelCase(idColumnName);

    return parsedInput[camelKey] ?? parsedInput[idColumnName];
}

/**
 * Builds the primary-key filter for update/existence queries.
 */
function buildPrimaryKeyWhereClause(
    rawTarget: DbTarget,
    parsedInput: MutationRow,
    idColumnNames: string[],
): SQL {
    if (idColumnNames.length === 0) {
        throw new Error("Missing primary key columns for update");
    }

    const table = parseRawTarget(rawTarget);
    const idColumns = getColumns(table) as Record<
        string,
        AnyColumn | undefined
    >;

    const predicates = idColumnNames.map((columnName) => {
        const column = idColumns[columnName];
        if (!column) {
            throw new Error(`Unknown primary key column: ${columnName}`);
        }
        const value = getPrimaryKeyValue(parsedInput, columnName);
        if (value === undefined) {
            throw new Error(`Missing primary key value for ${columnName}`);
        }
        return eq(column, value);
    });

    if (predicates.length === 1) {
        return predicates[0]!;
    }

    return and(...predicates)!;
}

/**
 * Removes normalized primary-key fields from an update mutation payload.
 */
function removeIdColumnsFromMutation(
    row: MutationRow,
    idColumns: AnyColumn[],
): MutationRow {
    const mutation = { ...row };
    for (const column of idColumns) {
        const dbKey = column.name;

        delete mutation[toCamelCase(dbKey)];
        delete mutation[dbKey];
    }

    return mutation;
}

/**
 * Fetches the current database row for an update so callers can validate it still exists.
 */
async function getExistingRows(
    rawTarget: DbTarget,
    whereClause: SQL,
): Promise<MutationRow[]> {
    const table = parseRawTarget(rawTarget);
    return db.select().from(table).where(whereClause).limit(1).execute();
}

/**
 * Saves the parsed row mutation to the database.
 */
export async function save(
    rawTarget: DbTarget,
    input: MutationRow,
    opts: SaveOptions = {},
): Promise<ActionResult> {
    const table = parseRawTarget(rawTarget);
    const parsedInput = await mutationInputSchema.parseAsync(input);

    const schema = opts.isUpdate
        ? createUpdateSchema(table)
        : createInsertSchema(table);
    const selectSchema = createSelectSchema(table);

    const sessionUser = await getSessionData();
    const actor = sessionUser?.username_normalized;

    if (!actor) {
        throw new Error("Missing authenticated user");
    }

    const actorId = await getUserId(requestUserId(actor));

    if (!actorId) {
        throw new Error("Missing authenticated user");
    }

    const row = await schema.parseAsync(
        toDbMutation(parsedInput, actorId, opts),
    );

    if (opts.isUpdate) {
        if (!opts.idColumnName) {
            throw new Error("Missing id column for update");
        }

        const idColumnNames = normalizeIdColumns(opts.idColumnName);

        const columns = getColumns(table) as Record<
            string,
            AnyColumn | undefined
        >;

        const idColumns: AnyColumn[] = [];
        for (const columnName of idColumnNames) {
            const column = columns[columnName];
            if (!column) {
                return { ok: false, error: `Unknown id column: ${columnName}` };
            }
            idColumns.push(column);
        }

        const mutationRow = removeIdColumnsFromMutation(row, idColumns);
        const whereClause = buildPrimaryKeyWhereClause(
            rawTarget,
            parsedInput,
            idColumnNames,
        );

        const existingRows = await getExistingRows(rawTarget, whereClause);

        await selectSchema.array().length(1).parseAsync(existingRows);

        const updateResult = await db
            .update(table)
            .set(mutationRow)
            .where(whereClause)
            .execute();

        // Ensure mutation actually affected one row.
        const affectedRows =
            typeof (updateResult as { rowCount?: number }).rowCount === "number"
                ? (updateResult as { rowCount: number }).rowCount
                : Array.isArray(updateResult)
                    ? updateResult.length
                    : undefined;

        if (affectedRows === undefined) {
            throw new Error(
                "Unable to verify update: database driver did not return affected row count",
            );
        } else if (affectedRows !== 1) {
            throw new Error("Update target no longer exists");
        }
    } else {
        await db.insert(table).values(row).execute();
    }

    // Runs only after a successful mutation so cached DB reads do not stay stale.
    try {
        updateDbCacheTags([rawTarget]);
    } catch (cacheErr) {
        log.error("Cache revalidation error:", cacheErr);
    }

    await emitDashboardChange(rawTarget);

    return { ok: true };
}

/**
 * Parses form.
 */
export async function parseForm(formData: FormData): Promise<MutationRow> {
    const entries = z
        .record(z.string(), z.unknown())
        .parse(Object.fromEntries(formData.entries())) as MutationRow;

    for (const [key, value] of Object.entries(entries)) {
        if (value === "") {
            entries[key] = null;
        }
    }

    if (entries.id !== undefined) {
        const idResult = z.coerce
            .number()
            .int()
            .positive()
            .safeParse(entries.id);
        if (!idResult.success) {
            throw new Error(`Invalid id value: ${entries.id}`);
        }
        entries.id = idResult.data;
    }

    return entries;
}
