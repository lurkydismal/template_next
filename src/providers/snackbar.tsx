"use client";

import {
    NotificationsNone as DefaultIcon,
    CheckCircleOutlined as SuccessIcon,
    ErrorOutlineOutlined as ErrorIcon,
    WarningAmber as WarningIcon,
    LightbulbOutlined as InfoIcon,
    Close as CloseIcon,
} from "@mui/icons-material";
import { IconButton } from "@mui/material";
import {
    SnackbarProvider,
    type VariantType,
    type OptionsObject,
    enqueueSnackbar,
    closeSnackbar,
} from "notistack";
import { createContext, useCallback, useContext, useMemo } from "react";

import { getErrorMessage } from "@/utils/errors";
import log from "@/utils/stdlog";
import { maxSnackbarCount } from "@/utils/stdvar";

type SnackbarOptions = Pick<OptionsObject, "persist" | "onClose">;

const SnackbarContext = createContext<{
    showMessage: (message: string, options?: SnackbarOptions) => void;
    showSuccess: (message: string, options?: SnackbarOptions) => void;
    showError: (err: unknown, options?: SnackbarOptions) => void;
    showWarning: (warn: unknown, options?: SnackbarOptions) => void;
    showInfo: (message: string, options?: SnackbarOptions) => void;
} | null>(null);

/**
 * Returns the snackbar hook state and actions.
 */
export function useSnackbar() {
    const ctx = useContext(SnackbarContext);

    if (!ctx) {
        throw new Error("useSnackbar must be used within SnackbarProvider");
    }

    return ctx;
}

/**
 * Renders the custom snackbar provider component.
 */
export default function CustomSnackbarProvider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    /**
     * Handles show message behavior.
     */
    const _showMessage = useCallback(
        (err: unknown, variant: VariantType, options?: SnackbarOptions) => {
            const message = getErrorMessage(err);

            if (variant === "error") {
                log.error("User-facing operation failed", err);
            } else if (variant === "warning") {
                log.warn(message);
            } else {
                log.info(message);
            }

            enqueueSnackbar(message, { variant, ...options });
        },
        [],
    );

    /**
     * Handles show message behavior.
     */
    const showMessage = useCallback(
        (message: string, options?: SnackbarOptions) => {
            _showMessage(message, "default", options);
        },
        [_showMessage],
    );

    /**
     * Handles show success behavior.
     */
    const showSuccess = useCallback(
        (message: string, options?: SnackbarOptions) => {
            _showMessage(message, "success", options);
        },
        [_showMessage],
    );

    /**
     * Handles show error behavior.
     */
    const showError = useCallback(
        (err: unknown, options?: SnackbarOptions) => {
            _showMessage(err, "error", options);
        },
        [_showMessage],
    );

    /**
     * Handles show warning behavior.
     */
    const showWarning = useCallback(
        (warn: unknown, options?: SnackbarOptions) => {
            _showMessage(warn, "warning", options);
        },
        [_showMessage],
    );

    /**
     * Handles show info behavior.
     */
    const showInfo = useCallback(
        (message: string, options?: SnackbarOptions) => {
            _showMessage(message, "info", options);
        },
        [_showMessage],
    );

    const contextValue = useMemo(
        () => ({ showMessage, showSuccess, showError, showWarning, showInfo }),
        [showError, showInfo, showMessage, showSuccess, showWarning],
    );

    return (
        <SnackbarProvider
            maxSnack={maxSnackbarCount}
            iconVariant={{
                default: <DefaultIcon sx={{ mr: 1.5 }} />,
                success: <SuccessIcon sx={{ mr: 1.5 }} />,
                error: <ErrorIcon sx={{ mr: 1.5 }} />,
                warning: <WarningIcon sx={{ mr: 1.5 }} />,
                info: <InfoIcon sx={{ mr: 1.5 }} />,
            }}
            preventDuplicate
            anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
            }}
            action={(snackbarId) => (
                <IconButton onClick={() => closeSnackbar(snackbarId)}>
                    <CloseIcon />
                </IconButton>
            )}
        >
            <SnackbarContext.Provider value={contextValue}>{children}</SnackbarContext.Provider>
        </SnackbarProvider>
    );
}
