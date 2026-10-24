"use client";

import type { TablesRow as TableRow, TablesRowInsert as TableRowInsert } from "@/db/types";

import ExtraToolbarButtons from "@/components/dashboard/ExtraToolbarButtons";
import TableDataGrid from "@/components/TableDataGrid";
import fields from "@/data/dashboard/tables/fields";
import { createRowAction, getRowsAction, updateRowAction } from "@/lib/dashboard/tables/function";

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
