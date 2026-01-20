"use server";

import { ActionResult, DbTarget } from "@/lib/types";
import { parseForm, save } from "@/lib/update_create";

export async function update(
    rawTarget: DbTarget,
    id: number,
    content: string,
): Promise<ActionResult> {
    return save(rawTarget, { id, content }, { isUpdate: true });
}

export async function updateAction(formData: FormData) {
    const rawTarget = formData.get("target") as DbTarget;
    const input = parseForm(formData);
    return save(rawTarget, input, { isUpdate: true });
}
