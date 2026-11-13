"use server";

import { requireSession } from "@/lib/dal/require-session";
import { saveAsActor } from "@/lib/dashboard/common/save-core";
import { ActionResult, DbTarget } from "@/lib/types";

/**
 * Creates a new row in the target table.
 */
export async function createAction<RI extends Record<string, unknown>>(
    rawTarget: DbTarget,
    row: RI,
): Promise<ActionResult> {
    const { user } = await requireSession();
    return saveAsActor(user.id, rawTarget, row, { isUpdate: false });
}
