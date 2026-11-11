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

import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { createElement } from "react";

import type { FieldConfig } from "@/components/TableDataGrid/RowDialog";

import BooleanFieldControl from "@/components/TableDataGrid/RowDialog/BooleanFieldControl";
import { toCamelCase } from "@/utils/stdfunc";

type NormalizeOptions = {
    defaultFlex?: number; // fallback flex when column.flex is missing
    minWidthMultiplier?: number; // multiplier used to compute minWidth = flex * multiplier
    defaultAlign?: GridColDef["align"]; // cell alignment default
    defaultHeaderAlign?: GridColDef["headerAlign"]; // header alignment default
    defaultRenderCell?: GridColDef["renderCell"]; // use when a column has no renderCell
    deriveField?: (headerName: GridColDef["headerName"]) => string; // how to derive missing `field`
};

type NormalizedColumnOptions = {
    defaultFlex: number;
    minWidthMultiplier: number;
    defaultAlign: GridColDef["align"];
    defaultHeaderAlign: GridColDef["headerAlign"];
    defaultRenderCell: NormalizeOptions["defaultRenderCell"];
    deriveField: NonNullable<NormalizeOptions["deriveField"]>;
};

function resolveField(
    item: Partial<GridColDef>,
    deriveField: NonNullable<NormalizeOptions["deriveField"]>,
) {
    if (item.field != null || item.headerName == null) return {};
    return { field: deriveField(item.headerName) };
}

function resolveRenderCell(
    item: Partial<GridColDef>,
    defaultRenderCell: NormalizeOptions["defaultRenderCell"],
) {
    if (item.renderCell != null || defaultRenderCell == null) return {};
    return { renderCell: defaultRenderCell };
}

function resolveDimensions(item: Partial<GridColDef>, options: NormalizedColumnOptions) {
    const flex = item.flex ?? options.defaultFlex;
    return {
        ...(item.flex == null ? { flex } : {}),
        ...(item.minWidth == null ? { minWidth: flex * options.minWidthMultiplier } : {}),
    };
}

function normalizeColumn(item: Partial<GridColDef>, options: NormalizedColumnOptions): GridColDef {
    return {
        ...item,
        headerAlign: item.headerAlign ?? options.defaultHeaderAlign,
        align: item.align ?? options.defaultAlign,
        ...resolveDimensions(item, options),
        ...resolveField(item, options.deriveField),
        ...resolveRenderCell(item, options.defaultRenderCell),
    } as GridColDef;
}

/**
 * Normalize and enrich all column definitions with consistent defaults.
 */
function normalizeColumns(
    cols: readonly Partial<GridColDef>[],
    options: NormalizeOptions = {},
): readonly GridColDef[] {
    const normalizedOptions: NormalizedColumnOptions = {
        defaultFlex: options.defaultFlex ?? 1,
        minWidthMultiplier: options.minWidthMultiplier ?? 100,
        defaultAlign: options.defaultAlign ?? "center",
        defaultHeaderAlign: options.defaultHeaderAlign ?? "center",
        defaultRenderCell: options.defaultRenderCell,
        deriveField:
            options.deriveField ??
            ((headerName) => (typeof headerName === "string" ? toCamelCase(headerName) : "")),
    };

    return cols.map((item) => normalizeColumn(item, normalizedOptions));
}

/**
 * Handles columns from fields behavior.
 */
export function columnsFromFields<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(fields: FieldConfig<R, RI>[]): readonly GridColDef[] {
    return normalizeColumns(
        fields
            .filter((field) => !field.hidden)
            .map((field) => ({
                field: String(field.key),
                flex: 1,
                headerName: field.label,
                ...(field.formatValue
                    ? {
                          /**
                           * Renders a data grid cell value from a normalized field definition.
                           */
                          renderCell: (params: GridRenderCellParams) =>
                              String(field.formatValue!(params.value) ?? ""),
                      }
                    : field.type === "boolean"
                      ? {
                            // Reuse the dialog's exact control styling, but keep table cells read-only.
                            renderCell: (params: GridRenderCellParams) =>
                                createElement(BooleanFieldControl, {
                                    label: field.label,
                                    checked: params.value === true,
                                    variant: field.variant,
                                    readOnly: true,
                                    color: field.color,
                                    size: field.scale,
                                    icon: field.variant === "icon" ? field.icon : undefined,
                                    checkedIcon:
                                        field.variant === "icon" ? field.checkedIcon : undefined,
                                }),
                        }
                      : {}),
            })),
    );
}
