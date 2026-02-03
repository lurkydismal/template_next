import TableDataGrid from "@/components/TableDataGrid";
import { TableRow, TableRowInsert } from "@/db/schema";
import { create } from "@/lib/create";
import { getRows } from "@/lib/get";
import { updateAction } from "@/lib/update";
import log from "@/utils/stdlog";
import { DbTarget } from "@/lib/types";
import ExtraToolbarButtons from "@/components/ExtraToolbarButtons";

export default function Page() {
    const table: DbTarget = "table";

    const emptyRow: TableRowInsert = {
        content: "-",
    };

    const _getRowsAction = async () => {
        "use server";

        const result = await getRows(table);

        if (result.ok) {
            return result.data;
        } else {
            const message = `Failed to get rows in action: ${result.error}`;
            log.error(message);
            throw new Error(message);
        }
    };

    const createRowAction = async (row: TableRowInsert) => {
        "use server";

        const result = await create(table, row);

        if (!result.ok) {
            const message = `Failed to create row in action: ${result.error}`;
            log.error(message);
            throw new Error(message);
        }
    };

    const updateRowAction = async (fd: FormData) => {
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

    return (
        <TableDataGrid<TableRow, TableRowInsert>
            emptyRow={emptyRow}
            getRowsAction={_getRowsAction}
            createRowAction={createRowAction}
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
