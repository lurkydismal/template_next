/**
 * normalizeColumns
 *
 * Shared utility to normalize MUI DataGrid column definitions.
 *
 * Responsibilities:
 * - Apply consistent defaults (alignment, flex, minWidth)
 * - Auto-derive `field` from `headerName` when missing
 * - Optionally supply a default `renderCell`
 *
 * Usage:
 * - Keep files focused on domain: export a small literal array of column metadata
 * - Call `normalizeColumns(rawColumns, options)` where you need the final GridColDef[]
 */

import { toCamelCase } from "@/utils/stdfunc";
import { GridColDef } from "@mui/x-data-grid";

type NormalizeOptions = {
    defaultFlex?: number; // fallback flex when column.flex is missing
    minWidthMultiplier?: number; // multiplier used to compute minWidth = flex * multiplier
    defaultAlign?: GridColDef["align"]; // cell alignment default
    defaultHeaderAlign?: GridColDef["headerAlign"]; // header alignment default
    defaultRenderCell?: GridColDef["renderCell"]; // use when a column has no renderCell
    deriveField?: (headerName: GridColDef["headerName"]) => string; // how to derive missing `field`
};

/**
 * Normalize a list of partial GridColDef entries into a readonly GridColDef[].
 */
export default function normalizeColumns(
    cols: readonly Partial<GridColDef>[],
    options: NormalizeOptions = {},
): readonly GridColDef[] {
    const {
        defaultFlex = 1,
        minWidthMultiplier = 100,
        defaultAlign = "center",
        defaultHeaderAlign = "center",
        defaultRenderCell,
        deriveField = (h) => (typeof h === "string" ? toCamelCase(h) : ""),
    } = options;

    return cols.map((item) => {
        const flex = item.flex ?? defaultFlex;
        const minWidth = item.minWidth ?? flex * minWidthMultiplier;

        return {
            ...item,
            headerAlign: item.headerAlign ?? defaultHeaderAlign,
            align: item.align ?? defaultAlign,
            ...(item.flex == null ? { flex } : {}),
            ...(item.minWidth == null ? { minWidth } : {}),
            ...(item.field == null && item.headerName != null
                ? { field: deriveField(item.headerName) }
                : {}),
            ...(item.renderCell == null && defaultRenderCell != null
                ? { renderCell: defaultRenderCell }
                : {}),
        } as GridColDef;
    }) as readonly GridColDef[];
}
