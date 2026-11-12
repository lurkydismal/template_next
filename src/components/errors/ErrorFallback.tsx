"use client";

import { HomeOutlined, Refresh } from "@mui/icons-material";
import { Alert, Box, Button, Container, Stack, Typography } from "@mui/material";
import NextLink from "next/link";
import { useEffect } from "react";

import { userMessages } from "@/utils/messages";
import log from "@/utils/stdlog";

/** Shared route-segment error UI. The original exception is logged, not exposed to users. */
export default function ErrorFallback({
    error,
    reset,
}: Readonly<{
    error: Error & { digest?: string };
    reset: () => void;
}>) {
    useEffect(() => {
        log.error("Unhandled route error", error);
    }, [error]);

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    minHeight: "70vh",
                    display: "grid",
                    placeItems: "center",
                    py: 6,
                }}
            >
                <Stack
                    spacing={3}
                    sx={{ alignItems: "center", textAlign: "center", width: "100%" }}
                >
                    <Box>
                        <Typography
                            variant="h4"
                            variantMapping={{ h4: "h1" }}
                            sx={{ fontWeight: 700 }}
                        >
                            {userMessages.errors.title}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                            {userMessages.errors.page}
                        </Typography>
                    </Box>

                    <Alert severity="error" sx={{ width: "100%", textAlign: "left" }}>
                        {userMessages.errors.unexpected}
                    </Alert>

                    {error.digest ? (
                        <Typography variant="caption" color="text.secondary">
                            Reference: {error.digest}
                        </Typography>
                    ) : null}

                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ justifyContent: "center", flexWrap: "wrap" }}
                    >
                        <Button onClick={reset} startIcon={<Refresh />} variant="contained">
                            {userMessages.actions.retry}
                        </Button>
                        <Button
                            component={NextLink}
                            href="/"
                            startIcon={<HomeOutlined />}
                            variant="outlined"
                        >
                            {userMessages.actions.home}
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Container>
    );
}
