"use server";

import { parseForm } from "@/lib/dashboard/common/form-parser";
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
    const input = parseForm(formData, rawTarget);
    return save(rawTarget, input, { isUpdate: true, idColumnName });
}
