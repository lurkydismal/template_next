"use server";

import type { ActionResult, DbTarget } from "@/lib/types";

import { requireSession } from "@/lib/dal/require-session";
import { type SaveOptions, saveAsActor } from "@/lib/dashboard/common/save-core";

/**
 * Creates or updates one row as the authenticated user.
 *
 * Authenticates before resolving the target or touching untrusted input. The actor is always
 * the session user's id, never a client-supplied value.
 */
export async function save(
    rawTarget: DbTarget,
    input: Record<string, unknown>,
    opts: SaveOptions = {},
): Promise<ActionResult> {
    const { user } = await requireSession();
    return saveAsActor(user.id, rawTarget, input, opts);
}
