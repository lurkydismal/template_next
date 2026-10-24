"use client";

import TableDataGrid from "@/components/TableDataGrid";
import ExtraToolbarButtons from "@/components/dashboard/ExtraToolbarButtons";
import fields from "@/data/dashboard/tables/fields";
import type {
    TablesRow as TableRow,
    TablesRowInsert as TableRowInsert,
} from "@/db/types";
import {
    createRowAction,
    getRowsAction,
    updateRowAction,
    getFileAction,
} from "@/lib/dashboard/tables/function";

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
            getFileAction={getFileAction}
            dashboardKey="table"
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
