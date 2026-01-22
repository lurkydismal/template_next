"use client";

/**
 * DataGrid column configuration for displaying table row records.
 *
 * This file defines and normalizes column metadata used by MUI X DataGrid,
 * including alignment, sizing defaults, date parsing, and value formatting.
 * The resulting column set is exported as a readonly configuration intended
 * for reuse across client-side table views.
 */

import normalizeColumns from "@/utils/columns";
import { GridColDef } from "@mui/x-data-grid";

/**
 * Base column definitions for the MUI DataGrid.
 * Some properties are intentionally omitted and later normalized in the `.map()` call below.
 */
const columns: GridColDef[] = [
    {
        field: "content",
        headerName: "Content",
    },
];

/**
 * Normalize and enrich all column definitions:
 * - Center-align headers and cell content
 * - Ensure `flex` is set (default: 1)
 * - Ensure `minWidth` is set (derived from `flex`)
 * - Ensure `field` exists (derived from headerName if missing)
 */
export default normalizeColumns(columns);
