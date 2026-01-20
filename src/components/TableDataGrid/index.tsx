"use client";

import CustomizedDataGrid from "@/components/CustomizedDataGrid";
import columns from "@/data/table/columns";
import { GridRowParams, GridRowsProp, useGridApiRef } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { TableRow } from "@/db/schema";
import RowDialog from "./RowDialog";
import { createAction } from "@/lib/create";
import { getRowsAction } from "@/lib/get";

export default function TableDataGrid() {
    const apiRef = useGridApiRef();
    const [currentRows, setCurrentRows] =
        useState<Readonly<GridRowsProp> | null>(null);
    const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        const fd = new FormData();
        fd.append('target', 'table')

        getRowsAction(fd).then((result) => {
            if (result.ok) {
                setCurrentRows(result.data);
            } else {
                throw new Error("TEST ERROR2");
            }
        });
    }, []);

    const handleRowClick = (params: GridRowParams) => {
        setSelectedRow(params.row as TableRow);
        setDialogOpen(true);
    };

    const handleClose = () => setDialogOpen(false);

    useEffect(() => {
        const submit = async () => {
            if (!currentRows) return;

            const fd = new FormData();
            fd.append('target', 'table')
            fd.append("content", "-");

            // call server action directly
            await createAction(fd);

            const fd1 = new FormData();
            fd1.append('target', 'table')

            const result = await getRowsAction(fd1);

            if (result.ok) {
                setCurrentRows(result.data);
            } else {
                throw new Error("TEST ERROR");
            }
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
    }, [currentRows, apiRef]);

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
                selectedRow={selectedRow}
                dialogOpen={dialogOpen}
                handleClose={handleClose}
                setSelectedRow={setSelectedRow}
            />
        </>
    );
}
