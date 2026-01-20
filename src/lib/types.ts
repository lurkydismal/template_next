import z from "zod";
import {
    table,
} from "@/db/schema";

export const TABLES = {
    table: table,
} as const;

export type DbTarget = keyof typeof TABLES;

export const DbTargetSchema = z.enum(
    Object.keys(TABLES) as [DbTarget, ...DbTarget[]],
);

export function parseRawTarget(rawTarget: DbTarget) {
    const target = DbTargetSchema.parse(rawTarget);
    const table = TABLES[target];
    if (!table) {
        throw new Error("Invalid db target in get");
    }

    return table;
}

export type ActionResult = { ok: true } | { ok: false; error: string };
