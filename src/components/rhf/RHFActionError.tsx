import { Alert } from "@mui/material";

/** Displays an action-level failure that cannot be attached to an individual field. */
export function RHFActionError({
    error,
}: Readonly<{
    error?: string;
}>) {
    if (!error) return null;

    return (
        <Alert severity="error" role="alert">
            {error}
        </Alert>
    );
}
