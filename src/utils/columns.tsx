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

import {
    ImagePreviewDialog,
    useImagePreview,
} from "@/components/TableDataGrid/RowDialog/ImagePreviewDialog";
import { FieldConfig } from "@/components/TableDataGrid/RowDialog";
import { isImagePath } from "@/utils/fileHelpers";
import { toCamelCase } from "@/utils/stdfunc";
import { Button, Link } from "@mui/material";
import { createElement, Fragment, MouseEvent } from "react";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import NextLink from "@/components/Link";

type NormalizeOptions = {
    defaultFlex?: number; // fallback flex when column.flex is missing
    minWidthMultiplier?: number; // multiplier used to compute minWidth = flex * multiplier
    defaultAlign?: GridColDef["align"]; // cell alignment default
    defaultHeaderAlign?: GridColDef["headerAlign"]; // header alignment default
    defaultRenderCell?: GridColDef["renderCell"]; // use when a column has no renderCell
    deriveField?: (headerName: GridColDef["headerName"]) => string; // how to derive missing `field`
};

/**
 * Renders an interactive file cell that reuses shared image preview behavior.
 */
function FileCellLink({
    value,
    getFileAction,
    width,
    height,
}: {
    value: string;
    getFileAction: (filename: string) => Promise<string>;
    width?: number | `${number}` | undefined;
    height?: number | `${number}` | undefined;
}) {
    const { imagePreviewOpen, openImagePreview, closeImagePreview } =
        useImagePreview();

    /**
     * Opens the preview dialog while preventing browser navigation.
     */
    function handleOpenPreview(event: MouseEvent<HTMLAnchorElement>): void {
        event.preventDefault();
        event.stopPropagation(); // Stop the click from reaching the dashboard row
        openImagePreview();
    }

    if (isImagePath(value)) {
        return (
            <>
                <Link
                    href={value}
                    variant="body2"
                    component={NextLink}
                    onClick={handleOpenPreview}
                >
                    Preview
                </Link>

                <ImagePreviewDialog
                    open={imagePreviewOpen}
                    onClose={closeImagePreview}
                    sourceValue={value}
                    label={value}
                    getFileAction={getFileAction}
                    width={width}
                    height={height}
                />
            </>
        );
    }

    return (
        <Link
            href={value}
            variant="body2"
            download
            component={NextLink}
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.stopPropagation(); // Stop the click from reaching the dashboard row
            }}
        >
            Download
        </Link>
    );
}

/**
 * Renders file-like values as action links with image-preview semantics.
 */
function renderFileCell(
    params: GridRenderCellParams,
    getFileAction: (filename: string) => Promise<string>,
    width?: number | `${number}`,
    height?: number | `${number}`,
) {
    const value = typeof params.value === "string" ? params.value : "";
    if (!value) return "";

    return (
        <FileCellLink
            value={value}
            width={width}
            height={height}
            getFileAction={getFileAction}
        />
    );
}

/**
 * Normalize and enrich all column definitions:
 * - Center-align headers and cell content
 * - Ensure `flex` is set (default: 1)
 * - Ensure `minWidth` is set (derived from `flex`)
 * - Ensure `field` exists (derived from headerName if missing)
 */
export function normalizeColumns(
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

        const field =
            item.field == null && item.headerName != null
                ? { field: deriveField(item.headerName) }
                : {};
        const renderCell =
            item.renderCell == null && defaultRenderCell != null
                ? { renderCell: defaultRenderCell }
                : {};

        return {
            ...item,
            headerAlign: item.headerAlign ?? defaultHeaderAlign,
            align: item.align ?? defaultAlign,
            ...(item.flex == null ? { flex } : {}),
            ...(item.minWidth == null ? { minWidth } : {}),
            ...field,
            ...renderCell,
        } as GridColDef;
    }) as readonly GridColDef[];
}

/**
 * Handles columns from fields behavior.
 */
export function columnsFromFields<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(
    fields: FieldConfig<R, RI>[],
    getFileAction: (filename: string) => Promise<string>,
): readonly GridColDef[] {
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
                    : field.type === "file"
                      ? {
                            renderCell: (params: GridRenderCellParams) =>
                                renderFileCell(
                                    params,
                                    getFileAction,
                                    field.width,
                                    field.height,
                                ),
                        }
                      : {}),
            })),
    );
}
