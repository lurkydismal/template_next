"use server";

import { tables } from "@/db/schema";
import { TablesRowInsert as TableRowInsert } from "@/db/types";
import {
    createTargetRowAction,
    getTargetRowsAction,
    updateTargetRowAction,
} from "@/lib/dashboard/common/function";
import { DbTarget } from "@/lib/types";

const target: DbTarget = "tables";
const idColumn = tables.id;

export async function getRowsAction(): ReturnType<typeof getTargetRowsAction> {
    return getTargetRowsAction(target, idColumn.name);
}

export async function createRowAction(
    row: TableRowInsert,
): ReturnType<typeof createTargetRowAction> {
    return createTargetRowAction(target, row);
}

export async function updateRowAction(fd: FormData): ReturnType<typeof updateTargetRowAction> {
    return updateTargetRowAction(target, idColumn.name, fd);
}
