"use client";

import CustomizedDataGrid from "@/components/CustomizedDataGrid";
import columns from "@/data/table/columns";
import { GridRowParams, GridRowsProp, useGridApiRef } from "@mui/x-data-grid";
import { useCallback, useEffect, useState } from "react";
import RowDialog from "./RowDialog";
import log from "@/utils/stdlog";

export default function TableDataGrid<Row, EmptyRow>({
    emptyRow,
    getRowsAction,
    createRowAction,
    updateRowAction,
}: {
    emptyRow: EmptyRow;
    getRowsAction: any;
    createRowAction: any;
    updateRowAction: any;
}) {
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
            log.error(err);
        }
    }, [getRowsAction]);

    useEffect(() => {
        _getRows();
    }, [_getRows]);

    // Creating row
    const _createRow = useCallback(async (content: string) => {
        try {
            await createRowAction(content);
        } catch (err) {
            log.error(err);
        }
    }, [createRowAction]);

    useEffect(() => {
        const submit = async () => {
            if (!currentRows) return;

            try {
                await _createRow(emptyRow.content);
            } catch (err) {
                log.error(err);
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
            <CustomizedDataGrid
                apiRef={apiRef}
                columns={columns}
                rows={currentRows ?? []}
                sx={{
                    "& .MuiDataGrid-row": {
                        cursor: "pointer",
                    },
                }}
                onRowClick={handleRowClick}
            />

            <RowDialog
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
