"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { FieldConfig } from "./RowDialog";
import type { CreateRowAction, UpdateRowAction } from "./RowDialog/types";

import RowDialog from "./RowDialog";

type RowDialogController = {
    openDialog: (row: Record<string, unknown>) => void;
};

const RowDialogControllerContext = createContext<RowDialogController | null>(null);

/**
 * Provides stable dialog-opening actions to the grid and its toolbar.
 * Dialog state is intentionally owned here rather than by TableDataGrid, so
 * opening, editing, and closing a dialog cannot re-render the grid's owner.
 */
export function useRowDialogController(): RowDialogController {
    const controller = useContext(RowDialogControllerContext);

    if (!controller) {
        throw new Error("useRowDialogController must be used within RowDialogHost");
    }

    return controller;
}

type RowDialogHostProps<R extends Record<string, unknown>, RI extends Record<string, unknown>> = {
    children: ReactNode;
    fields: FieldConfig<R, RI>[];
    dashboardKey: string;
    createRowAction: CreateRowAction<RI>;
    updateRowAction: UpdateRowAction;
    onUpdated?: () => Promise<void> | void;
    idKey?: keyof R;
};

/**
 * Hosts the row dialog beside the grid while keeping its state out of the grid
 * component tree. The provider value contains stable callbacks only; it does
 * not expose dialog state to grid consumers.
 */
export default function RowDialogHost<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>({
    children,
    fields,
    dashboardKey,
    createRowAction,
    updateRowAction,
    onUpdated,
    idKey,
}: RowDialogHostProps<R, RI>) {
    const [selectedRow, setSelectedRow] = useState<R | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const openDialog = useCallback((row: Record<string, unknown>) => {
        setSelectedRow(row as R);
        setDialogOpen(true);
    }, []);

    const handleClose = useCallback(() => {
        setDialogOpen(false);
    }, []);

    const controller = useMemo(() => ({ openDialog }), [openDialog]);

    return (
        <RowDialogControllerContext.Provider value={controller}>
            {children}
            <RowDialog<R, RI>
                dialogOpen={dialogOpen}
                fields={fields}
                handleClose={handleClose}
                selectedRow={selectedRow}
                setSelectedRow={setSelectedRow}
                dashboardKey={dashboardKey}
                createRowAction={createRowAction}
                updateRowAction={updateRowAction}
                onUpdated={onUpdated}
                idKey={idKey}
            />
        </RowDialogControllerContext.Provider>
    );
}
