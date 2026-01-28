import { Tooltip } from "@mui/material";
import TableDataGrid from "@/components/TableDataGrid";
import { TableRow, TableRowInsert } from "@/db/schema";
import { create } from "@/lib/create";
import { getRows } from "@/lib/get";
import { updateAction } from "@/lib/update";
import log from "@/utils/stdlog";
import {
    Queue as MockShowIcon,
    AddBoxOutlined as AddIcon,
} from "@mui/icons-material";
import uuid from "@/utils/uuid";
import { ToolbarButton } from "@mui/x-data-grid";
import CustomDivider from "@/components/CustomDivider";
import { useSnackbar } from "@/components/SnackbarProvider";
import { DbTarget } from "@/lib/types";

function ExtraToolbarButtons({
    emptyRow,
    createRowAction,
}: Readonly<{
    emptyRow: TableRowInsert;
    createRowAction: any;
}>) {
    const { showMessage, showSuccess, showError, showWarning, showInfo } =
        useSnackbar();

    return (
        <>
            <Tooltip title="Show nock snackbars">
                <ToolbarButton
                    onClick={() => {
                        showMessage(uuid());
                        showSuccess(uuid());
                        showError(uuid());
                        showWarning(uuid());
                        showInfo(uuid());
                    }}
                >
                    <MockShowIcon fontSize="small" />
                </ToolbarButton>
            </Tooltip>

            <Tooltip title="Add new row">
                <ToolbarButton
                    onClick={async () => {
                        try {
                            await createRowAction(emptyRow);
                        } catch (err) {
                            showError(err);
                        }
                    }}
                >
                    <AddIcon fontSize="small" />
                </ToolbarButton>
            </Tooltip>

            <CustomDivider />
        </>
    );
}

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
