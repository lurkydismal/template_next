"use client";

import type { GridRowsProp } from "@mui/x-data-grid";

import { Box, CircularProgress } from "@mui/material";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useDashboardEventStream } from "@/lib/dashboard/client-events";
import { useSnackbar } from "@/providers/snackbar";

import type { FieldConfig } from "./RowDialog";

import GridView from "./GridView";
import RowDialogHost from "./RowDialogHost";

/**
 * Renders the table data grid and loads its data/field configuration.
 * Dialog state is delegated to RowDialogHost, preventing dialog interactions
 * from re-rendering this component or the grid.
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
    dashboardKey,
}: Readonly<{
    getRowsAction: () => Promise<Readonly<GridRowsProp>>;
    createRowAction: (row: RI) => Promise<void>;
    updateRowAction: (fd: FormData) => Promise<void>;
    extraButtons?: ReactNode; // optionally a ReactElement expecting props
    fields: FieldConfig<R, RI>[];
    dashboardKey: string;
}>) {
    const { showError } = useSnackbar();
    const [currentRows, setCurrentRows] = useState<Readonly<GridRowsProp> | null>(null);
    const [resolvedFields, setResolvedFields] = useState(fields);
    const [fieldsResolving, setFieldsResolving] = useState(false);

    useEffect(() => {
        let active = true;

        /**
         * Resolves async field configuration declared by each field.
         */
        const resolveFields = async () => {
            const hasLoaders = fields.some(
                (field) => field.type === "autocomplete" && field.loadOptions,
            );
            if (!hasLoaders) {
                setResolvedFields(fields);
                return;
            }

            setFieldsResolving(true);
            try {
                const nextFields = await Promise.all(
                    fields.map(async (field) => {
                        if (field.type !== "autocomplete" || !field.loadOptions) {
                            return field;
                        }

                        try {
                            return {
                                ...field,
                                autocompleteOptions: await field.loadOptions(),
                            };
                        } catch {
                            // Preserve field without resolved options on individual failure.
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

    /**
     * Fetches the current table rows and reports failures through the snackbar.
     */
    const getRows = useCallback(async () => {
        try {
            setCurrentRows(await getRowsAction());
        } catch (error) {
            showError(error);
        }
    }, [getRowsAction, showError]);

    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Coalesces bursts of row-change events into a single data refresh.
     */
    const scheduleRefresh = useCallback(() => {
        if (refreshTimeoutRef.current !== null) clearTimeout(refreshTimeoutRef.current);

        refreshTimeoutRef.current = setTimeout(() => {
            void getRows();
            refreshTimeoutRef.current = null;
        }, 120);
    }, [getRows]);

    const handleStreamEvent = useCallback(
        (payload: { event?: string }) => {
            if (payload.event === "dashboard-change") scheduleRefresh();
        },
        [scheduleRefresh],
    );

    const handleReconnect = useCallback(() => {
        // A reconnect can happen after mutations whose SSE frames were lost.
        void getRows();
    }, [getRows]);

    useEffect(() => {
        void getRows();

        return () => {
            if (refreshTimeoutRef.current !== null) {
                clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = null;
            }
        };
    }, [getRows]);

    useDashboardEventStream({ onEvent: handleStreamEvent, onReconnect: handleReconnect });

    /**
     * Wraps create so a successful mutation refreshes the displayed rows.
     */
    const createAndRefresh = useCallback(
        async (row: RI) => {
            try {
                await createRowAction(row);
                await getRows();
            } catch (error) {
                showError(error);
                throw error;
            }
        },
        [createRowAction, getRows, showError],
    );

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
        <RowDialogHost<R, RI>
            fields={resolvedFields}
            dashboardKey={dashboardKey}
            createRowAction={createAndRefresh}
            updateRowAction={updateRowAction}
            onUpdated={getRows}
        >
            <GridView<R, RI>
                rows={currentRows}
                fields={resolvedFields}
                extraButtons={extraButtons}
            />
        </RowDialogHost>
    );
}
