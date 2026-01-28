"use server";

import { TableRowInsert } from "@/db/schema";
import { ActionResult, DbTarget } from "@/lib/types";
import { parseForm, save } from "@/lib/update_create";

export async function update(
    rawTarget: DbTarget,
    row: TableRowInsert,
): Promise<ActionResult> {
    return save(rawTarget, row, { isUpdate: true });
}

export async function updateAction(formData: FormData) {
    const rawTarget = formData.get("target") as DbTarget;
    const input = parseForm(formData);
    return save(rawTarget, input, { isUpdate: true });
}
