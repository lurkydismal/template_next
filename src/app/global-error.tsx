"use client";

import { useEffect } from "react";

import { userMessages } from "@/utils/messages";
import log from "@/utils/stdlog";

/** Last-resort boundary for root-layout failures; it does not depend on app providers. */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        log.error("Unhandled root layout error", error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    padding: "24px",
                    background: "#f8fafc",
                    color: "#0f172a",
                    fontFamily: "Arial, sans-serif",
                }}
            >
                <main style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
                    <h1 style={{ fontSize: 24, marginBottom: 12 }}>{userMessages.errors.title}</h1>
                    <p style={{ color: "#475569", lineHeight: 1.6 }}>{userMessages.errors.page}</p>
                    <p
                        role="alert"
                        style={{
                            padding: 12,
                            borderRadius: 8,
                            background: "#fee2e2",
                            color: "#991b1b",
                        }}
                    >
                        {userMessages.errors.unexpected}
                    </p>
                    {error.digest ? (
                        <p style={{ color: "#64748b", fontSize: 12 }}>Reference: {error.digest}</p>
                    ) : null}
                    <button
                        onClick={reset}
                        style={{
                            border: 0,
                            borderRadius: 6,
                            padding: "10px 16px",
                            background: "#1d4ed8",
                            color: "white",
                            cursor: "pointer",
                            fontSize: 14,
                        }}
                    >
                        {userMessages.actions.retry}
                    </button>
                </main>
            </body>
        </html>
    );
}
