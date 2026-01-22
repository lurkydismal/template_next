import TableDataGrid from "@/components/TableDataGrid";
import { TableRow } from "@/db/schema";
import { getRows } from "@/lib/get";
import { create } from "@/lib/create";
import log from "@/utils/stdlog";
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
            const message = `Failed to get rows in action: ${result.error}`;
            log.error(message);
            throw new Error(message);
        }
    };

    const createRowAction = async (content: string) => {
        "use server";

        const result = await create(table, content);

        if (!result.ok) {
            // handle/report error if needed
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
            // handle/report error if needed
            const message = `Failed to update row in action: ${result.error}`;
            log.error(message);
            throw new Error(message);
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
