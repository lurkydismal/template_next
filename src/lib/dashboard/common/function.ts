"use server";

import { create } from "@/lib/dashboard/common/create";
import { getRows } from "@/lib/dashboard/common/get";
import { updateAction } from "@/lib/dashboard/common/update";
import { DbTarget } from "@/lib/types";
import { AnyColumn } from "drizzle-orm";

/**
 * Gets rows action.
 */
export async function getRowsAction(target: DbTarget, idColumnName: string) {
    const result = await getRows(target, idColumnName);

    if (result.ok) {
        if (!result.data) {
            throw new Error("getRows returned ok but no data");
        }
        return result.data;
    } else {
        const message = `Failed to get rows in action: ${result.error}`;
        throw new Error(message);
    }
}

/**
 * Creates row action.
 */
export async function createRowAction<RI extends Record<string, unknown>>(
    target: DbTarget,
    row: RI,
) {
    const result = await create(target, row);

    if (!result.ok) {
        const message = `Failed to create row in action: ${result.error}`;
        throw new Error(message);
    }
}

/**
 * Updates row action.
 */
export async function updateRowAction(
    target: DbTarget,
    id: AnyColumn,
    fd: FormData,
) {
    const result = await updateAction(target, id, fd);

    if (!result.ok) {
        const message = `Failed to update row in action: ${result.error}`;
        throw new Error(message);
    }
}
