import log from "@/utils/stdlog";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import { Dispatch, SetStateAction, useCallback, useRef, useState } from "react";
import { CreateRowAction, FieldConfig, UpdateRowAction } from "./types";
import RowDialogContent from "./Content";

export type { FieldConfig } from "./types";

/**
 * Renders the row dialog component.
 */
export default function RowDialog<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>({
    dialogOpen,
    handleClose,
    selectedRow,
    setSelectedRow,
    dashboardKey,
    createRowAction,
    updateRowAction,
    onUpdated,
    fields,
    idKey = "id" as keyof R,
}: {
    dialogOpen: boolean;
    handleClose: () => void;
    selectedRow: R | null;
    setSelectedRow: Dispatch<SetStateAction<R | null>>;
    dashboardKey: string;
    createRowAction: CreateRowAction<RI>;
    updateRowAction: UpdateRowAction;
    onUpdated?: () => Promise<void> | void;
    fields: FieldConfig<R, RI>[];
    idKey?: keyof R;
}) {
    const submitFnRef = useRef<(() => Promise<boolean>) | null>(null);
    const validationFailureTimestampsRef = useRef<number[]>([]);
    const [forceCloseDialogOpen, setForceCloseDialogOpen] = useState(false);

    /**
     * Registers a failed validation-close attempt and returns true
     * when the user has failed to close 3 times inside 10 seconds.
     */
    const shouldShowForceCloseDialog = useCallback((): boolean => {
        const now = Date.now();
        const tenSecondsAgo = now - 10_000;
        const recentFailures = validationFailureTimestampsRef.current.filter(
            (timestamp) => timestamp >= tenSecondsAgo,
        );

        recentFailures.push(now);
        validationFailureTimestampsRef.current = recentFailures;

        return recentFailures.length >= 3;
    }, []);

    /**
     * Resets the validation failure counter used for force-close prompting.
     */
    const clearValidationFailureCounter = useCallback(() => {
        validationFailureTimestampsRef.current = [];
    }, []);

    /**
     * Registers the row dialog submit callback exposed by the content form.
     */
    const registerSubmit = (fn: (() => Promise<boolean>) | null) => {
        submitFnRef.current = fn;
    };

    /**
     * Attempts to submit the dialog before closing it.
     */
    const onClose = async () => {
        try {
            if (submitFnRef.current) {
                const ok = await submitFnRef.current();
                if (!ok) {
                    if (shouldShowForceCloseDialog()) {
                        setForceCloseDialogOpen(true);
                    }
                    return;
                }
            }

            clearValidationFailureCounter();
            handleClose();
        } catch (error) {
            log.error("Failed to close row dialog", error);
        }
    };

    /**
     * Closes both dialogs and discards pending validation errors.
     */
    const handleConfirmForceClose = useCallback(() => {
        setForceCloseDialogOpen(false);
        clearValidationFailureCounter();
        handleClose();
    }, [clearValidationFailureCounter, handleClose]);

    /**
     * Hides the force-close confirmation and keeps the row dialog open.
     */
    const handleCancelForceClose = useCallback(() => {
        setForceCloseDialogOpen(false);
    }, []);

    return (
        <>
            <Dialog
                open={dialogOpen}
                onClose={onClose}
                maxWidth="md"
                fullWidth
                keepMounted
                slotProps={{
                    transition: {
                        /**
                         * Clears dialog state after the row dialog transition exits.
                         */
                        onExited: () => {
                            setSelectedRow(null);
                        },
                    },
                }}
            >
                <DialogContent>
                    {selectedRow && (
                        <RowDialogContent<R, RI>
                            row={selectedRow}
                            fields={fields}
                            dashboardKey={dashboardKey}
                            registerSubmit={registerSubmit}
                            createRowAction={createRowAction}
                            updateRowAction={updateRowAction}
                            onUpdated={onUpdated}
                            idKey={idKey}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={forceCloseDialogOpen}
                onClose={handleCancelForceClose}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Leave dialog?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        You still have invalid fields. Do you want to leave
                        anyway and discard changes?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleCancelForceClose}
                        variant="contained"
                        color="error"
                    >
                        No
                    </Button>
                    <Button
                        onClick={handleConfirmForceClose}
                        variant="contained"
                        color="success"
                    >
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
