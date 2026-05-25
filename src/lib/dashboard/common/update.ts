"use server";

import { DbTarget } from "@/lib/types";
import { parseForm, save } from "@/lib/dashboard/common/update_create";

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
