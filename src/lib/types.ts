import type { AnyColumn } from "drizzle-orm";

import { z } from "zod";

import * as schema from "@/db/schema";

// Only tables listed here can be read or mutated through the generic dashboard layer.
// Better Auth tables (user, session, account, verification), notifications and the audit
// log are deliberately excluded: they have dedicated, separately authorized code paths.
export const TABLES = { tables: schema.tables } as const;

type TableName = keyof typeof TABLES;

export const DbTargetSchema = z.enum(Object.keys(TABLES) as [TableName, ...TableName[]]);

export type DbTarget = z.infer<typeof DbTargetSchema>;

/**
 * Parses a raw target and returns its Drizzle table, including the audit columns
 * required by the dashboard mutation layer.
 */
export function parseRawTarget(rawTarget: DbTarget): (typeof TABLES)[DbTarget] & {
    author_id: AnyColumn;
    last_editor_id: AnyColumn;
} {
    const target = DbTargetSchema.parse(rawTarget);
    const table = TABLES[target];
    if (!table) {
        throw new Error("Invalid db target in get");
    }

    return table as (typeof TABLES)[DbTarget] & {
        author_id: AnyColumn;
        last_editor_id: AnyColumn;
    };
}

type SuccessResult<T> = { ok: true; data: T };
type FailureResult = { ok: false; error: string };

export type ActionResult<T = void> = SuccessResult<T> | FailureResult;
