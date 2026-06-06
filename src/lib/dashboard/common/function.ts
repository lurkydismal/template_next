"use server";

import { createAction } from "@/lib/dashboard/common/create";
import { getRows } from "@/lib/dashboard/common/get";
import { updateAction } from "@/lib/dashboard/common/update";
import { DbTarget } from "@/lib/types";
import { getFileAction as _getFileAction } from "@/lib/getFile";

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
    const result = await createAction(target, row);

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
    idColumnName: string | string[],
    fd: FormData,
) {
    const result = await updateAction(target, idColumnName, fd);

    if (!result.ok) {
        const message = `Failed to update row in action: ${result.error}`;
        throw new Error(message);
    }
}

/**
 * Get file action.
 */
export async function getFileAction(target: DbTarget, filename: string) {
    const result = await _getFileAction(target, filename);

    if (!result.ok) {
        const message = `Failed to get file in action: ${result.error}`;
        throw new Error(message);
    }

    return result.data;
}
