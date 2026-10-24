"use server";

import { GridValidRowModel } from "@mui/x-data-grid";
import { AnyColumn, desc, eq, getColumns } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";

import db from "@/db";
import { cacheDbRequest } from "@/lib/cache";
import { ActionResult, DbTarget, parseRawTarget } from "@/lib/types";
import log from "@/utils/stdlog";
import { toCamelCase } from "@/utils/stdfunc";
import { users } from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import z from "zod";

/**
 * Gets rows.
 */
export async function getRows(
    rawTarget: DbTarget,
    idColumnName: string,
): Promise<ActionResult<readonly GridValidRowModel[]>> {
    "use cache";
    cacheDbRequest([rawTarget]);

    try {
        const table = parseRawTarget(rawTarget);

        const columns = getColumns(table) as Record<
            string,
            AnyColumn | undefined
        >;
        const id = columns[idColumnName];
        if (!id) {
            return { ok: false, error: "Unknown id column" };
        }

        const author = alias(users, "author");
        const last_editor = alias(users, "last_editor");

        const rows = await db
            .select({
                ...columns,
                author: author.username,
                last_editor: last_editor.username,
            })
            .from(table)
            .leftJoin(author, eq(table.author_id, author.id))
            .leftJoin(last_editor, eq(table.last_editor_id, last_editor.id))
            .orderBy(desc(id))
            .execute();
        const rowSchema = createSelectSchema(table)
            .extend({
                author: z.string().nullable().optional(),
                last_editor: z.string().nullable().optional(),
            })
            .array();
        const validRows = await rowSchema.parseAsync(rows);

        // If no rows, just return early
        if (validRows.length === 0) {
            return { ok: true, data: validRows };
        }

        // Check if "id" already exists
        const hasId = 0 in validRows ? "id" in validRows[0] : false;

        type Row = (typeof validRows)[number];

        const result = hasId
            ? validRows
            : validRows.map((row: Row) => ({
                ...row,
                id:
                    row[toCamelCase(id.name) as keyof Row] ??
                    row[id.name as keyof Row], // fallback to original name
            }));

        return {
            ok: true,
            data: result,
        };
    } catch (err) {
        // err is a ZodError on validation failure or other error
        log.error("Get error:", err);

        return { ok: false, error: "Get error" };
    }
}
