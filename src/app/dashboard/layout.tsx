"use client";

import { SnackbarProvider } from "@/components/SnackbarProvider";
/**
 * RootLayout Component
 *
 * Provides the top-level layout for the application with global theme, baseline styles,
 * and suspense handling for asynchronously loaded content.
 *
 * Features:
 * - Wraps children with `AppTheme` for MUI theme support (light/dark mode, custom theme settings).
 * - Applies `CssBaseline` with `enableColorScheme` to normalize styles across browsers and enable system color schemes.
 * - Uses a full viewport-height container (`Box`) to ensure layout fills the screen.
 * - Wraps children with React `Suspense` to handle async components gracefully.
 *   - Displays a full-screen loading spinner (`CircularProgress`) while children are loading.
 *
 * Props:
 * - `children`: React.ReactNode – all nested page content/components.
 */

import AppTheme from "@/theme/theme";
import { Box, CircularProgress, CssBaseline } from "@mui/material";
import { Suspense } from "react";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // Apply global theme to all child components
        <AppTheme>
            <CssBaseline enableColorScheme />

            {/* Full viewport-height container */}
            <Box className="h-dvh">
                {/* Suspense boundary for async content */}
                <Suspense
                    fallback={
                        <Box
                            sx={{
                                width: "100vw",
                                height: "100vh",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    }
                >
                    <SnackbarProvider>
                        {children}
                    </SnackbarProvider>
                </Suspense>
            </Box>
        </AppTheme>
    );
}
