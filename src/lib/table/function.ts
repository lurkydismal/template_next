"use server";

import { TableRowInsert } from "@/db/schema";
import { create } from "@/lib/create";
import { getRows } from "@/lib/get";
import { updateAction } from "@/lib/update";
import log from "@/utils/stdlog";
import { DbTarget } from "@/lib/types";

const table: DbTarget = "table";

export const _getRowsAction = async () => {
    const result = await getRows(table);

    if (result.ok) {
        return result.data;
    } else {
        const message = `Failed to get rows in action: ${result.error}`;
        log.error(message);
        throw new Error(message);
    }
};

export const createRowAction = async (row: TableRowInsert) => {
    "use server";

    const result = await create(table, row);

    if (!result.ok) {
        const message = `Failed to create row in action: ${result.error}`;
        log.error(message);
        throw new Error(message);
    }
};

export const updateRowAction = async (fd: FormData) => {
    "use server";

    fd.set("target", table);

    const result = await updateAction(fd);

    if (!result.ok) {
        const message = `Failed to update row in action: ${result.error}`;
        log.error(message);
        throw new Error(message);
    }

    return result.ok;
};
