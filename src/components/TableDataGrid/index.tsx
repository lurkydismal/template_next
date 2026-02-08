"use client";

import React, {
    useCallback,
    useEffect,
    useState,
    cloneElement,
    isValidElement,
} from "react";
import CustomDataGrid from "@/components/CustomDataGrid";
import columns from "@/data/table/columns";
import RowDialog, { FieldConfig } from "./RowDialog";
import { useSnackbar } from "@/components/SnackbarProvider";
import CustomToolbar from "./Toolbar";
import { useGridApiRef, GridRowsProp, GridRowParams } from "@mui/x-data-grid";

export default function TableDataGrid<
    R extends Record<string, any>,
    RI extends Record<string, any>,
>({
    emptyRow,
    getRowsAction,
    createRowAction,
    updateRowAction,
    extraButtons,
    fields,
    isRowChanged,
}: Readonly<{
    emptyRow: RI;
    getRowsAction: () => Promise<Readonly<GridRowsProp>>;
    createRowAction: (row: RI) => Promise<any>;
    updateRowAction: (fd: FormData) => Promise<boolean>;
    extraButtons?: React.ReactNode; // optionally a ReactElement expecting props
    fields: FieldConfig<R, RI>[];
    isRowChanged?: (row: R, values: Partial<RI>) => boolean;
}>) {
    const { showError } = useSnackbar();
    const apiRef = useGridApiRef();
    const [currentRows, setCurrentRows] =
        useState<Readonly<GridRowsProp> | null>(null);
    const [selectedRow, setSelectedRow] = useState<R | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Getting rows
    const _getRows = useCallback(async () => {
        try {
            setCurrentRows(await getRowsAction());
        } catch (err) {
            showError(err);
        }
    }, [getRowsAction, showError]);

    useEffect(() => {
        _getRows();
    }, [_getRows]);

    // the original createRowAction wrapped so we always refresh UI after create
    const createAndRefresh = useCallback(
        async (row: RI) => {
            try {
                const created = await createRowAction(row);
                // Option A: re-fetch full list (safe)
                await _getRows();

                // Option B (optimistic): if create returns the created row with id, you can:
                // if (created && created.id !== undefined && apiRef?.current?.updateRows) {
                //   apiRef.current.updateRows([{ id: created.id, ...created }]);
                // }

                return created;
            } catch (err) {
                showError(err);
            }
        },
        [createRowAction, _getRows, showError, apiRef],
    );

    // Keyboard shortcut & other internal creators use createAndRefresh
    useEffect(() => {
        const submit = async () => {
            if (!currentRows) return;
            try {
                await createAndRefresh(emptyRow);
            } catch (err) {
                showError(err);
            }
            // scroll to top row (you might want to select the created row if you can get its id)
            setTimeout(
                () => apiRef.current?.scrollToIndexes?.({ rowIndex: 0 }),
                0,
            );
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m"))
                return;

            const active = document.activeElement;
            if (
                active &&
                (active.tagName === "INPUT" ||
                    active.tagName === "TEXTAREA" ||
                    (active as HTMLElement).isContentEditable)
            ) {
                return;
            }

            e.preventDefault();
            void submit();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [currentRows, createAndRefresh, emptyRow, showError, apiRef]);

    const handleRowClick = (params: GridRowParams) => {
        setSelectedRow(params.row as R);
        setDialogOpen(true);
    };

    const handleClose = () => setDialogOpen(false);

    // If extraButtons is a React element, clone it and inject createRowAction + emptyRow
    const injectedExtraButtons = isValidElement(extraButtons)
        ? cloneElement(extraButtons as React.ReactElement<any>, {
              createRowAction: createAndRefresh,
              emptyRow,
          })
        : extraButtons;

    return (
        <>
            <CustomDataGrid
                apiRef={apiRef}
                columns={columns}
                rows={currentRows ?? []}
                sx={{
                    "& .MuiDataGrid-row": {
                        cursor: "pointer",
                    },
                }}
                onRowClick={handleRowClick}
                slots={{ toolbar: CustomToolbar }}
                slotProps={{
                    toolbar: {
                        extraButtons: injectedExtraButtons,
                    },
                }}
            />

            <RowDialog<R, RI>
                apiRef={apiRef}
                dialogOpen={dialogOpen}
                fields={fields}
                handleClose={handleClose}
                isRowChanged={isRowChanged}
                selectedRow={selectedRow}
                setSelectedRow={setSelectedRow}
                updateRowAction={updateRowAction}
            />
        </>
    );
}
