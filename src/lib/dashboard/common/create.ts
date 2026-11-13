"use server";

import { requireSession } from "@/lib/dal/require-session";
import { save } from "@/lib/dashboard/common/update_create";
import { ActionResult, DbTarget } from "@/lib/types";

/**
 * Creates a new row in the target table.
 */
export async function createAction<RI extends Record<string, unknown>>(
    rawTarget: DbTarget,
    row: RI,
): Promise<ActionResult> {
    await requireSession();
    return save(rawTarget, row, { isUpdate: false });
}
