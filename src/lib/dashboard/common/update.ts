"use server";

import { save } from "@/lib/dashboard/common/update_create";
import { DbTarget } from "@/lib/types";

/**
 * Updates action.
 */
export async function updateAction(
    rawTarget: DbTarget,
    idColumnName: string | string[],
    formData: FormData,
) {
    // save() authorizes before parsing this untrusted FormData payload.
    return save(rawTarget, formData, { isUpdate: true, idColumnName });
}
