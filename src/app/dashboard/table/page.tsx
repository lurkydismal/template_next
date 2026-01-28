"use client";

import { Tooltip } from "@mui/material";
import TableDataGrid from "@/components/TableDataGrid";
import { TableRow } from "@/db/schema";
import { create } from "@/lib/create";
import { getRows } from "@/lib/get";
import { update } from "@/lib/update";
import log from "@/utils/stdlog";
import {
    Queue as MockShowIcon,
    AddBoxOutlined as AddIcon,
} from "@mui/icons-material";
import uuid from "@/utils/uuid";
import { ToolbarButton } from "@mui/x-data-grid";
import CustomDivider from "@/components/CustomDivider";
import { useSnackbar } from "@/components/SnackbarProvider";

interface EmptyRow {
    content: string;
}

function ExtraToolbarButtons({
    emptyRow,
    createRow,
}: Readonly<{
    emptyRow: EmptyRow;
    createRow: any;
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
                            await createRow(emptyRow);
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
    const emptyRow: EmptyRow = {
        content: "-",
    };

    const _getRows = async () => {
        const result = await getRows();

        if (result.ok) {
            return result.data;
        } else {
            const message = `Failed to get rows in action: ${result.error}`;
            log.error(message);
            throw new Error(message);
        }
    };

    const createRow = async ({ content }: { content: string }) => {
        const result = await create(content);

        if (!result.ok) {
            const message = `Failed to create row in action: ${result.error}`;
            log.error(message);
            throw new Error(message);
        }
    };

    const updateRow = async ({
        id,
        content,
    }: {
        id: number;
        content: string;
    }) => {
        const result = await update(id, content);

        if (!result.ok) {
            const message = `Failed to update row in action: ${result.error}`;
            log.error(message);
            throw new Error(message);
        }

        return result.ok;
    };

    return (
        <TableDataGrid<TableRow, EmptyRow>
            emptyRow={emptyRow}
            getRows={_getRows}
            createRow={createRow}
            updateRow={updateRow}
            extraButtons={
                <ExtraToolbarButtons
                    emptyRow={emptyRow}
                    createRow={createRow}
                />
            }
        />
    );
}
