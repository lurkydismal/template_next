"use client";

import { TableRowInsert } from "@/db/schema";
import CustomDivider from "@/components/CustomDivider";
import { useSnackbar } from "@/components/SnackbarProvider";
import uuid from "@/utils/uuid";
import {
    Queue as MockShowIcon,
    AddBoxOutlined as AddIcon,
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { ToolbarButton } from "@mui/x-data-grid";

export default function ExtraToolbarButtons({
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
