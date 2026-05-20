"use client";

import React, {
    useCallback,
    useEffect,
    useState,
    cloneElement,
    isValidElement,
} from "react";
import CustomDataGrid from "./CustomDataGrid";
import RowDialog, { FieldConfig } from "./RowDialog";
import { useSnackbar } from "@/providers/snackbar";
import CustomToolbar from "./Toolbar";
import { useGridApiRef, GridRowsProp, GridRowParams } from "@mui/x-data-grid";
import { Box, CircularProgress } from "@mui/material";
import { columnsFromFields } from "@/utils/columns";

/**
 * Renders the table data grid component.
 */
export default function TableDataGrid<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>({
    getRowsAction,
    createRowAction,
    updateRowAction,
    extraButtons,
    fields,
}: Readonly<{
    getRowsAction: () => Promise<Readonly<GridRowsProp>>;
    createRowAction: (row: RI) => Promise<void>;
    updateRowAction: (fd: FormData) => Promise<void>;
    extraButtons?: React.ReactNode; // optionally a ReactElement expecting props
    fields: FieldConfig<R, RI>[];
}>) {
    const { showError } = useSnackbar();
    const apiRef = useGridApiRef();
    const [currentRows, setCurrentRows] =
        useState<Readonly<GridRowsProp> | null>(null);
    const [resolvedFields, setResolvedFields] = useState(fields);
    const [fieldsResolving, setFieldsResolving] = useState(false);
    const [selectedRow, setSelectedRow] = useState<R | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const emptyRow = React.useMemo(
        () =>
            resolvedFields.reduce((row, field) => {
                row[field.key as keyof RI] = (field.placeholder ??
                    null) as RI[keyof RI];
                return row;
            }, {} as RI),
        [resolvedFields],
    );

    useEffect(() => {
        let active = true;

        /**
         * Resolves async field configuration declared by each field.
         */
        const resolveFields = async () => {
            const hasLoaders = fields.some((field) => field.loadOptions);
            if (!hasLoaders) {
                setResolvedFields(fields);
                return;
            }

            setFieldsResolving(true);
            try {
                const nextFields = await Promise.all(
                    fields.map(async (field) => {
                        if (!field.loadOptions) return field;

                        try {
                            return {
                                ...field,
                                autocompleteOptions: await field.loadOptions(),
                            };
                        } catch {
                            // Preserve field without resolved options on individual failure
                            return field;
                        }
                    }),
                );

                if (active) setResolvedFields(nextFields);
            } catch (error) {
                if (active) showError(error);
            } finally {
                if (active) setFieldsResolving(false);
            }
        };

        void resolveFields();

        return () => {
            active = false;
        };
    }, [fields, showError]);

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
                await createRowAction(row);
                // Option A: re-fetch full list (safe)
                await _getRows();

                // Option B (optimistic): if create returns the created row with id, you can:
                // if (created && created.id !== undefined && apiRef?.current?.updateRows) {
                //   apiRef.current.updateRows([{ id: created.id, ...created }]);
                // }
            } catch (err) {
                showError(err);
                throw err;
            }
        },
        [createRowAction, _getRows, showError],
    );

    const openCreateDialog = useCallback(() => {
        setSelectedRow(emptyRow as unknown as R);
        setDialogOpen(true);
    }, [emptyRow]);

    // Keyboard shortcut opens create dialog with empty defaults
    useEffect(() => {
        /**
         * Submits the current form or dialog state.
         */
        const submit = () => {
            if (!currentRows) return;
            openCreateDialog();
            // scroll to top row (you might want to select the created row if you can get its id)
            setTimeout(
                () => apiRef.current?.scrollToIndexes?.({ rowIndex: 0 }),
                0,
            );
        };

        /**
         * Handles keyboard shortcuts for the editable data grid.
         */
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
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [currentRows, openCreateDialog, apiRef]);

    /**
     * Handles row click.
     */
    const handleRowClick = (params: GridRowParams) => {
        setSelectedRow(params.row as R);
        setDialogOpen(true);
    };

    /**
     * Handles close.
     */
    const handleClose = () => setDialogOpen(false);

    // If extraButtons is a React element, clone it and inject createRowAction + emptyRow
    const injectedExtraButtons = isValidElement(extraButtons)
        ? cloneElement(
              extraButtons as React.ReactElement<Record<string, unknown>>,
              {
                  createRowAction: {
                      type: "dialog",
                      action: openCreateDialog,
                  },
                  emptyRow,
              },
          )
        : extraButtons;

    const columns = columnsFromFields(resolvedFields);

    if (currentRows === null || fieldsResolving) {
        return (
            <Box
                sx={{
                    flexGrow: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <CustomDataGrid
                apiRef={apiRef}
                columns={columns}
                rows={currentRows}
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
                dialogOpen={dialogOpen}
                fields={resolvedFields}
                handleClose={handleClose}
                selectedRow={selectedRow}
                setSelectedRow={setSelectedRow}
                createRowAction={createAndRefresh}
                updateRowAction={updateRowAction}
                onUpdated={_getRows}
            />
        </>
    );
}
