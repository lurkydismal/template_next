"use client";

import CustomDivider from "@/components/TableDataGrid/CustomDivider";
import { useSnackbar } from "@/providers/snackbar";
import uuid from "@/utils/uuid";
import {
    Queue as MockShowIcon,
    AddBoxOutlined as AddIcon,
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { ToolbarButton } from "@mui/x-data-grid";

type DialogCreateRowAction = {
    type: "dialog";
    action: () => void;
};

type DirectCreateRowAction<RI extends Record<string, unknown>> = {
    type: "direct";
    action: (row: RI) => Promise<void>;
};

type CreateRowAction<RI extends Record<string, unknown>> =
    | DialogCreateRowAction
    | DirectCreateRowAction<RI>;

/**
 * Determines whether the configured create action opens the create dialog.
 */
function isDialogCreateAction<RI extends Record<string, unknown>>(
    createRowAction: CreateRowAction<RI>,
): createRowAction is DialogCreateRowAction {
    return createRowAction.type === "dialog";
}

/**
 * Renders the extra toolbar buttons component.
 */
export default function ExtraToolbarButtons<
    // R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>({
    emptyRow,
    createRowAction,
}: Readonly<{
    emptyRow?: RI;
    createRowAction: CreateRowAction<RI>;
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
                    onClick={() => {
                        if (isDialogCreateAction(createRowAction)) {
                            createRowAction.action();
                        } else if (emptyRow) {
                            createRowAction.action(emptyRow).catch((err) => {
                                showError(
                                    `Failed to create row: ${err.message}`,
                                );
                            });
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
