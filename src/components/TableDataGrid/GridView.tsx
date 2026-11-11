"use client";

import { useGridApiRef, type GridRowParams, type GridRowsProp } from "@mui/x-data-grid";
import {
    cloneElement,
    isValidElement,
    memo,
    useCallback,
    useEffect,
    useMemo,
    type ReactElement,
    type ReactNode,
} from "react";

import { columnsFromFields } from "@/utils/columns";

import type { FieldConfig } from "./RowDialog";

import CustomDataGrid from "./CustomDataGrid";
import { useRowDialogController } from "./RowDialogHost";
import CustomToolbar from "./Toolbar";

const dataGridSx = {
    "& .MuiDataGrid-row": {
        cursor: "pointer",
    },
} as const;

const dataGridSlots = { toolbar: CustomToolbar };

type GridViewProps<R extends Record<string, unknown>, RI extends Record<string, unknown>> = {
    rows: Readonly<GridRowsProp>;
    fields: FieldConfig<R, RI>[];
    extraButtons?: ReactNode;
};

/**
 * Renders the actual grid. It consumes only a stable dialog command, never the
 * dialog's open/selected-row state, so dialog interactions do not invalidate
 * this component or the MUI DataGrid subtree.
 */
function GridView<R extends Record<string, unknown>, RI extends Record<string, unknown>>({
    rows,
    fields,
    extraButtons,
}: GridViewProps<R, RI>) {
    const apiRef = useGridApiRef();
    const { openDialog } = useRowDialogController();

    const emptyRow = useMemo(
        () =>
            fields.reduce((row, field) => {
                row[field.key as keyof RI] = (
                    field.type !== "boolean" &&
                    field.type !== "radio-group" &&
                    field.type !== "repeater"
                        ? (field.placeholder ?? null)
                        : null
                ) as RI[keyof RI];
                return row;
            }, {} as RI),
        [fields],
    );

    const openCreateDialog = useCallback(() => {
        openDialog(emptyRow);
    }, [emptyRow, openDialog]);

    const handleRowClick = useCallback(
        (params: GridRowParams) => {
            openDialog(params.row as R);
        },
        [openDialog],
    );

    // Keyboard shortcut opens the create dialog with the same defaults as the toolbar.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "m")) {
                return;
            }

            const active = document.activeElement;
            if (
                active &&
                (active.tagName === "INPUT" ||
                    active.tagName === "TEXTAREA" ||
                    (active as HTMLElement).isContentEditable)
            ) {
                return;
            }

            event.preventDefault();
            openCreateDialog();
            window.setTimeout(() => apiRef.current?.scrollToIndexes?.({ rowIndex: 0 }), 0);
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [apiRef, openCreateDialog]);

    const injectedExtraButtons = useMemo(
        () =>
            isValidElement(extraButtons)
                ? cloneElement(extraButtons as ReactElement<Record<string, unknown>>, {
                      createRowAction: {
                          type: "dialog",
                          action: openCreateDialog,
                      },
                      emptyRow,
                  })
                : extraButtons,
        [emptyRow, extraButtons, openCreateDialog],
    );

    const gridColumns = useMemo(() => columnsFromFields(fields), [fields]);

    const slotProps = useMemo(
        () => ({ toolbar: { extraButtons: injectedExtraButtons } }),
        [injectedExtraButtons],
    );

    return (
        <CustomDataGrid
            apiRef={apiRef}
            columns={gridColumns}
            rows={rows}
            sx={dataGridSx}
            onRowClick={handleRowClick}
            slots={dataGridSlots}
            slotProps={slotProps}
        />
    );
}

export default memo(GridView) as typeof GridView;
