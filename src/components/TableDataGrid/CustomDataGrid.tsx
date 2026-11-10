"use client";

import { DataGrid, type DataGridProps, type GridRowsProp, type GridColDef } from "@mui/x-data-grid";
import { memo } from "react";

type TasksGridProps = Omit<DataGridProps, "rows" | "columns"> & {
    columns: readonly GridColDef[];
    rows: Readonly<GridRowsProp>;
};

const pageSizeOptions = [100];

/**
 * Renders the custom data grid component.
 *
 * The memo boundary is important because dialog state lives in a sibling host.
 * It also protects the MUI grid from unrelated renders above this component
 * when all grid inputs are referentially stable.
 */
function CustomDataGrid({ columns, rows, ...props }: TasksGridProps) {
    return (
        <DataGrid
            autoPageSize
            columns={columns}
            density="compact"
            disableRowSelectionOnClick
            pageSizeOptions={pageSizeOptions}
            rows={rows}
            showToolbar
            {...props}
        />
    );
}

export default memo(CustomDataGrid);
