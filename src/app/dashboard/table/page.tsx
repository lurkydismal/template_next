"use client";

import TableDataGrid from "@/components/TableDataGrid";
import { TableRow, TableRowInsert } from "@/db/schema";
import ExtraToolbarButtons from "@/components/ExtraToolbarButtons";
import {
    _getRowsAction,
    createRowAction,
    updateRowAction,
} from "@/lib/table/function";
import fields from "@/data/table/fields";

export default function Page() {
    const emptyRow: TableRowInsert = {
        content: "-",
    };

    // Optional: custom change detector (compares trimmed content)
    const isRowChanged = (row: TableRow, values: Partial<TableRowInsert>) => {
        const a = String(row.content ?? "").trim();
        const b = String(values.content ?? "").trim();
        return a !== b;
    };

    return (
        <TableDataGrid<TableRow, TableRowInsert>
            createRowAction={createRowAction}
            emptyRow={emptyRow}
            fields={fields}
            getRowsAction={_getRowsAction}
            isRowChanged={isRowChanged}
            updateRowAction={updateRowAction}
            extraButtons={
                <ExtraToolbarButtons
                    emptyRow={emptyRow}
                    createRowAction={createRowAction}
                />
            }
        />
    );
}
