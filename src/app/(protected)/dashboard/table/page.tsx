"use client";

import TableDataGrid from "@/components/TableDataGrid";
import ExtraToolbarButtons from "@/components/dashboard/ExtraToolbarButtons";
import fields from "@/data/dashboard/table/fields";
import type {
    TableRow as TableRow,
    TableRowInsert as TableRowInsert,
} from "@/db/types";
import {
    createRowAction,
    getRowsAction,
    updateRowAction,
} from "@/lib/dashboard/table/function";

/**
 * Renders the protected bans dashboard page.
 */
export default function Page() {
    return (
        <TableDataGrid<TableRow, TableRowInsert>
            createRowAction={createRowAction}
            fields={fields}
            getRowsAction={getRowsAction}
            updateRowAction={updateRowAction}
            extraButtons={
                <ExtraToolbarButtons
                    createRowAction={{
                        type: "direct",
                        action: createRowAction,
                    }}
                />
            }
        />
    );
}
