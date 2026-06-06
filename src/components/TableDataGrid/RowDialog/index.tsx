import log from "@/utils/stdlog";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Paper,
    PaperProps,
    Slide,
} from "@mui/material";
import {
    Dispatch,
    forwardRef,
    SetStateAction,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { CreateRowAction, FieldConfig, UpdateRowAction } from "./types";
import RowDialogContent from "./Content";
import { TransitionProps } from "@mui/material/transitions";
import Draggable from "react-draggable";

export type { FieldConfig } from "./types";

const promptButtonSx = {
    transition: "all 0.2s ease",

    "&:hover": {
        transform: "translateY(-2px)",
    },
};

const createSlideTransition = (direction: "up" | "down" | "left" | "right") =>
    forwardRef(function Transition(
        props: TransitionProps & { children: React.ReactElement },
        ref: React.Ref<unknown>,
    ) {
        return <Slide direction={direction} ref={ref} {...props} />;
    });

export const TransitionRight = createSlideTransition("right");
export const TransitionUp = createSlideTransition("up");

function PaperComponent(props: PaperProps) {
    const nodeRef = useRef<HTMLDivElement>(null);
    return (
        <Draggable
            nodeRef={nodeRef as React.RefObject<HTMLDivElement>}
            handle="#draggable-dialog-title"
            cancel={'[class*="MuiDialogContent-root"]'}
        >
            <Paper {...props} ref={nodeRef} />
        </Draggable>
    );
}

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
    getFileAction,
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
    getFileAction: (filename: string) => Promise<string>;
    onUpdated?: () => Promise<void> | void;
    fields: FieldConfig<R, RI>[];
    idKey?: keyof R;
}) {
    const submitFnRef = useRef<(() => Promise<boolean>) | null>(null);
    const discardDraftFnRef = useRef<(() => void) | null>(null);
    const validationFailureTimestampsRef = useRef<number[]>([]);
    const closeSubmissionInProgressRef = useRef(false);
    const [forceCloseDialogOpen, setForceCloseDialogOpen] = useState(false);

    useEffect(() => {
        // Reset the close-submit lock for each newly opened row dialog session.
        if (dialogOpen) {
            closeSubmissionInProgressRef.current = false;
        }
    }, [dialogOpen]);

    /**
     * Registers a failed validation-close attempt and returns true
     * when the user has failed to close 2 times inside 10 seconds.
     */
    const shouldShowForceCloseDialog = useCallback((): boolean => {
        const now = Date.now();
        const tenSecondsAgo = now - 10_000;
        const recentFailures = validationFailureTimestampsRef.current.filter(
            (timestamp) => timestamp >= tenSecondsAgo,
        );

        recentFailures.push(now);
        validationFailureTimestampsRef.current = recentFailures;

        return recentFailures.length >= 2;
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
     * Registers the content callback that permanently drops the active saved draft.
     */
    const registerDiscardDraft = (fn: (() => void) | null) => {
        discardDraftFnRef.current = fn;
    };

    /**
     * Attempts to submit the dialog before closing it.
     */
    const onClose = async () => {
        if (closeSubmissionInProgressRef.current) return;

        try {
            if (submitFnRef.current) {
                closeSubmissionInProgressRef.current = true;
                const ok = await submitFnRef.current();
                if (!ok) {
                    closeSubmissionInProgressRef.current = false;
                    if (shouldShowForceCloseDialog()) {
                        setForceCloseDialogOpen(true);
                    }
                    return;
                }
            }

            clearValidationFailureCounter();
            handleClose();
        } catch (error) {
            closeSubmissionInProgressRef.current = false;
            log.error("Failed to close row dialog", error);
        }
    };

    /**
     * Closes both dialogs and discards pending validation errors.
     */
    const handleConfirmForceClose = useCallback(() => {
        setForceCloseDialogOpen(false);
        discardDraftFnRef.current?.();
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
                slots={{
                    transition: TransitionRight,
                }}
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
                            registerDiscardDraft={registerDiscardDraft}
                            createRowAction={createRowAction}
                            updateRowAction={updateRowAction}
                            getFileAction={getFileAction}
                            onUpdated={onUpdated}
                            idKey={idKey}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={forceCloseDialogOpen}
                slots={{
                    transition: TransitionUp,
                }}
                PaperComponent={PaperComponent}
                aria-labelledby="draggable-dialog-title"
                onClose={handleCancelForceClose}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle
                    style={{ cursor: "move" }}
                    id="draggable-dialog-title"
                >
                    Leave dialog?
                </DialogTitle>
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
                        sx={promptButtonSx}
                    >
                        No
                    </Button>
                    <Button
                        onClick={handleConfirmForceClose}
                        variant="contained"
                        color="success"
                        sx={promptButtonSx}
                    >
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
