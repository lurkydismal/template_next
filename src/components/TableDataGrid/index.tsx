"use client";

import CustomDataGrid from "@/components/CustomDataGrid";
import columns from "@/data/table/columns";
import { useCallback, useEffect, useState } from "react";
import RowDialog from "./RowDialog";
import { useSnackbar } from "@/components/SnackbarProvider";
import CustomToolbar from "./Toolbar";
import { useGridApiRef, GridRowsProp, GridRowParams } from "@mui/x-data-grid";

export default function TableDataGrid<Row, RowInsert>({
    emptyRow,
    getRowsAction,
    createRowAction,
    updateRowAction,
    extraButtons,
}: Readonly<{
    emptyRow: RowInsert;
    getRowsAction: any;
    createRowAction: any;
    updateRowAction: any;
    extraButtons?: React.ReactNode;
}>) {
    const { showError } = useSnackbar();
    const apiRef = useGridApiRef();
    const [currentRows, setCurrentRows] =
        useState<Readonly<GridRowsProp> | null>(null);
    const [selectedRow, setSelectedRow] = useState<Row | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Getting rows
    const _getRows = useCallback(async () => {
        try {
            setCurrentRows(await getRowsAction());
        } catch (err) {
            showError(err);
        }
    }, [getRowsAction]);

    useEffect(() => {
        _getRows();
    }, [_getRows]);

    // Creating row
    const _createRow = useCallback(
        async (row: RowInsert) => {
            try {
                await createRowAction(row);
            } catch (err) {
                showError(err);
            }
        },
        [createRowAction],
    );

    useEffect(() => {
        const submit = async () => {
            if (!currentRows) return;

            try {
                // FIX: Improve
                await _createRow(emptyRow);
            } catch (err) {
                showError(err);
            }

            await _getRows();
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

            submit();

            // select/ scroll:
            setTimeout(() => {
                // apiRef.current?.setSelectionModel?.([newId]);
                apiRef.current?.scrollToIndexes?.({ rowIndex: 0 });
            }, 0);
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [_getRows, _createRow, currentRows, apiRef]);

    const handleRowClick = (params: GridRowParams) => {
        setSelectedRow(params.row as Row);
        setDialogOpen(true);
    };

    const handleClose = () => setDialogOpen(false);

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
                        extraButtons,
                    },
                }}
            />

            <RowDialog<Row, RowInsert>
                apiRef={apiRef}
                dialogOpen={dialogOpen}
                handleClose={handleClose}
                selectedRow={selectedRow}
                setSelectedRow={setSelectedRow}
                updateRowAction={updateRowAction}
            />
        </>
    );
}
