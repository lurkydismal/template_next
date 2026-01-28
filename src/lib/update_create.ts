import db from "@/db";
import { TableRowInsert } from "@/db/schema";
import { ActionResult, DbTarget, parseRawTarget } from "@/lib/types";
import log from "@/utils/stdlog";
import { rowSchema } from "@/utils/validate/schemas";
import { eq } from "drizzle-orm";

type Input = {
    id?: number;
    content: string;
};

async function buildInsert(parsed: {
    content: string;
}): Promise<TableRowInsert> {
    return {
        content: parsed.content,
    } as const;
}

export async function save(
    rawTarget: DbTarget,
    input: Input,
    opts: { isUpdate?: boolean } = {},
): Promise<ActionResult> {
    try {
        const table = parseRawTarget(rawTarget);

        const parsed = await rowSchema.parseAsync({
            id: input.id,
            content: input.content,
        });

        const row = await buildInsert({
            content: parsed.content,
        });

        if (opts.isUpdate) {
            await db
                .update(table)
                .set(row)
                .where(eq(table.id, parsed.id!))
                .execute();
        } else {
            await db.insert(table).values(row).execute();
        }

        return { ok: true };
    } catch (err) {
        log.error(opts.isUpdate ? "Update error:" : "Create error:", err);
        return {
            ok: false,
            error: opts.isUpdate ? "Update error" : "Create error",
        };
    }
}

/* FormData parsing helper reused by both actions */

export function parseForm(formData: FormData): Input {
    const rawId = formData.get("id");
    const id = rawId == null ? undefined : Number(rawId);
    return {
        id,
        content: String(formData.get("content") ?? ""),
    };
}
