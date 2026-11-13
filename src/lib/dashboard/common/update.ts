"use server";

import { requireSession } from "@/lib/dal/require-session";
import { parseForm } from "@/lib/dashboard/common/form-parser";
import { saveAsActor } from "@/lib/dashboard/common/save-core";
import { DbTarget } from "@/lib/types";

/**
 * Updates action.
 */
export async function updateAction(
    rawTarget: DbTarget,
    idColumnName: string | string[],
    formData: FormData,
) {
    // Authenticate once, before parsing untrusted FormData.
    const { user } = await requireSession();
    const input = parseForm(formData, rawTarget);
    return saveAsActor(user.id, rawTarget, input, { isUpdate: true, idColumnName });
}
