"use server";

import { ActionResult, DbTarget } from "@/lib/types";
import { save } from "@/lib/dashboard/common/update_create";

/**
 * Creates a new row in the target table.
 */
export async function create<RI extends Record<string, unknown>>(
    rawTarget: DbTarget,
    row: RI,
): Promise<ActionResult> {
    return save(rawTarget, row, { isUpdate: false });
}
