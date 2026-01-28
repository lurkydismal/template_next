"use server";

import db from "@/db";
import log from "@/utils/stdlog";
import { desc } from "drizzle-orm";
import { GridRowsProp } from "@mui/x-data-grid";
import { DbTarget, parseRawTarget } from "@/lib/types";
import { ActionResult } from "@/lib/types";

// TODO: Validate what returns
export async function getRows(rawTarget: DbTarget): Promise<Return> {
    try {
        const table = parseRawTarget(rawTarget);

        return {
            ok: true,
            data: await db
                .select()
                .from(table)
                .orderBy(desc(table.id))
                .execute(),
        };
    } catch (err) {
        // err is a ZodError on validation failure or other error
        log.error("Get error:", err);

        return { ok: false, error: "Get error" };
    }
}

export async function getRowsAction(formData: FormData) {
    const rawTarget = formData.get("target");

    // Cast and delegate to main upload function
    return await getRows(rawTarget as DbTarget);
}
