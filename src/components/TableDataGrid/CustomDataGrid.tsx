"use client";

import {
    DataGrid,
    DataGridProps,
    GridRowsProp,
    GridColDef,
} from "@mui/x-data-grid";

type TasksGridProps = Omit<DataGridProps, "rows" | "columns"> & {
    columns: readonly GridColDef[];
    rows: Readonly<GridRowsProp>;
};

export default function CustomDataGrid({
    columns,
    rows,
    ...props
}: TasksGridProps) {
    return (
        <DataGrid
            autoPageSize
            columns={columns}
            density="compact"
            disableRowSelectionOnClick
            pageSizeOptions={[100]}
            rows={rows}
            showToolbar
            {...props}
        />
    );
}
