import log from "@/utils/stdlog";
import { Dialog, DialogContent } from "@mui/material";
import { Dispatch, SetStateAction, useRef } from "react";
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
    createRowAction: CreateRowAction<RI>;
    updateRowAction: UpdateRowAction;
    onUpdated?: () => Promise<void> | void;
    fields: FieldConfig<R, RI>[];
    idKey?: keyof R;
}) {
    const submitFnRef = useRef<(() => Promise<boolean>) | null>(null);

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
                if (!ok) return;
            }

            handleClose();
        } catch (error) {
            log.error("Failed to close row dialog", error);
        }
    };

    return (
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
                        registerSubmit={registerSubmit}
                        createRowAction={createRowAction}
                        updateRowAction={updateRowAction}
                        onUpdated={onUpdated}
                        idKey={idKey}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
