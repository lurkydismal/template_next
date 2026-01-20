"use server";

import { ActionResult, DbTarget } from "@/lib/types";
import { parseForm, save } from "@/lib/update_create";

export async function create(
    rawTarget: DbTarget,
    content: string,
): Promise<ActionResult> {
    return save(rawTarget, { content }, { isUpdate: false });
}

export async function createAction(formData: FormData) {
    const rawTarget = formData.get("target") as DbTarget;
    const input = parseForm(formData);
    return save(rawTarget, input, { isUpdate: false });
}
