"use client";

import { Alert, Snackbar } from "@mui/material";
import { createContext, useContext, useState } from "react";

const SnackbarContext = createContext<{
    showError: (err: unknown) => void;
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

export function SnackbarProvider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [open, setOpen] = useState(false);
    const [msg, setMsg] = useState("");

    const showError = (err: unknown) => {
        setMsg(errorToMessage(err));
        setOpen(true);
    };

    const handleClose = (
        _event?: React.SyntheticEvent | Event,
        reason?: string,
    ) => {
        if (reason === "clickaway") return;
        setOpen(false);
    };

    return (
        <SnackbarContext.Provider value={{ showError }}>
            {children}
            <Snackbar
                key={msg}
                open={open}
                autoHideDuration={4000}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert severity="error" variant="filled">
                    {msg}
                </Alert>
            </Snackbar>
        </SnackbarContext.Provider>
    );
}
