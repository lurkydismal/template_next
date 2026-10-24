"use server";

import { parseForm, save } from "@/lib/dashboard/common/update_create";
import { DbTarget } from "@/lib/types";

/**
 * Updates action.
 */
export async function updateAction(
    rawTarget: DbTarget,
    idColumnName: string | string[],
    formData: FormData,
) {
    const input = await parseForm(formData);
    return save(rawTarget, input, { isUpdate: true, idColumnName });
}
