import TableDataGrid from "@/components/TableDataGrid";
import { TableRow } from "@/db/schema";
import { getRows } from "@/lib/get";
import { create } from "@/lib/create";
import log, { logVar } from "@/utils/stdlog";
import { updateAction } from "@/lib/update";

export default async function Page() {
    const table = "table";

    interface EmptyRow {
        content: string;
    }

    const emptyRow: EmptyRow = {
        content: "-",
    };

    const getRowsAction = async () => {
        "use server";

        const result = await getRows(table);

        if (result.ok) {
            return result.data;
        } else {
            // handle/report error if needed
            log.error("Failed to get rows in action", result.error);
        }
    };

    const createRowAction = async (content: string) => {
        "use server";

        const result = await create(table, content);

        if (!result.ok) {
            // handle/report error if needed
            log.error("Failed to create row in action", result.error);
        }
    };

    const updateRowAction = async (fd: FormData) => {
        "use server";

        fd.set("target", table);

        const result = await updateAction(fd);

        if (!result.ok) {
            // handle/report error if needed
            log.error("Failed to update row in action", result.error);
        }

        return result.ok;
    };

    return (
        <TableDataGrid<TableRow, EmptyRow>
            emptyRow={emptyRow}
            getRowsAction={getRowsAction}
            createRowAction={createRowAction}
            updateRowAction={updateRowAction}
        />
    );
}
