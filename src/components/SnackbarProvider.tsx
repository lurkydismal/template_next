"use client";

import log, { LogFn } from "@/utils/stdlog";
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
    VariantType,
    enqueueSnackbar,
    closeSnackbar,
} from "notistack";
import { createContext, useContext } from "react";

const SnackbarContext = createContext<{
    showMessage: (message: string) => void;
    showSuccess: (message: string) => void;
    showError: (err: unknown) => void;
    showWarning: (warn: unknown) => void;
    showInfo: (message: string) => void;
} | null>(null);

function errorToMessage(err: unknown): string {
    if (err instanceof Error) {
        return err.message || "Operation failed";
    }

    if (typeof err === "string") {
        return err;
    }

    return "Operation failed";
}

export function useSnackbar() {
    const ctx = useContext(SnackbarContext);

    if (!ctx) {
        throw new Error("useSnackbar must be used within SnackbarProvider");
    }

    return ctx;
}

export default function CustomSnackbarProvider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const _showMessage = (err: unknown, variant?: VariantType) => {
        const message = errorToMessage(err);

        let logVariant: LogFn;

        switch (variant) {
            case "error":
                logVariant = log.error;
                break;

            case "warning":
                logVariant = log.warn;
                break;

            case "success":
            case "info":
            case "default":
            default:
                logVariant = log.info;
        }

        logVariant(message);

        enqueueSnackbar(message, { variant });
    };

    const showMessage = (message: string) => {
        _showMessage(message, "default");
    };

    const showSuccess = (message: string) => {
        _showMessage(message, "success");
    };

    const showError = (err: unknown) => {
        _showMessage(err, "error");
    };

    const showWarning = (warn: unknown) => {
        _showMessage(warn, "warning");
    };

    const showInfo = (message: string) => {
        _showMessage(message, "info");
    };

    return (
        <SnackbarContext.Provider
            value={{
                showMessage,
                showSuccess,
                showError,
                showWarning,
                showInfo,
            }}
        >
            {children}

            <SnackbarProvider
                maxSnack={5}
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
            />
        </SnackbarContext.Provider>
    );
}
