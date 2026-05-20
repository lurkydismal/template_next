"use server";

import { table } from "@/db/schema";
import { TableRowInsert as TableRowInsert } from "@/db/types";
import { DbTarget } from "@/lib/types";
import {
    createRowAction as _createRowAction,
    getRowsAction as _getRowsAction,
    updateRowAction as _updateRowAction,
} from "@/lib/dashboard/common/function";

const target: DbTarget = "table";
const idColumn = table.id;

export async function getRowsAction(): ReturnType<typeof _getRowsAction> {
    return _getRowsAction(target, idColumn.name);
}

export async function createRowAction(
    row: TableRowInsert,
): ReturnType<typeof _createRowAction> {
    return _createRowAction(target, row);
}

export async function updateRowAction(
    fd: FormData,
): ReturnType<typeof _updateRowAction> {
    return _updateRowAction(target, idColumn, fd);
}
