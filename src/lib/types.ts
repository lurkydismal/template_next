import * as schema from "@/db/schema";
import { DbTargetSchema } from "@/utils/validate/schemas";
import { AnyColumn } from "drizzle-orm";

export const TABLES = schema;

export type DbTarget = keyof typeof TABLES;

/**
 * Parses raw target.
 */
export function parseRawTarget(
    rawTarget: DbTarget,
): (typeof TABLES)[DbTarget] & {
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
