"use client";

import TableDataGrid from "@/components/TableDataGrid";
import ExtraToolbarButtons from "@/components/dashboard/ExtraToolbarButtons";
import fields from "@/data/dashboard/tables/fields";
import type {
    TablesRow as TablesRow,
    TablesRowInsert as TablesRowInsert,
} from "@/db/types";
import {
    createRowAction,
    getRowsAction,
    updateRowAction,
} from "@/lib/dashboard/tables/function";

/**
 * Renders the protected bans dashboard page.
 */
export default function Page() {
    return (
        <TableDataGrid<TablesRow, TablesRowInsert>
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
