"use server";

import { DbTarget } from "@/lib/types";
import { parseForm, save } from "@/lib/dashboard/common/update_create";
import { AnyColumn } from "drizzle-orm";

/**
 * Updates action.
 */
export async function updateAction(
    rawTarget: DbTarget,
    idColumn: AnyColumn | AnyColumn[],
    formData: FormData,
) {
    const input = await parseForm(formData);
    return save(rawTarget, input, { isUpdate: true, idColumn });
}
