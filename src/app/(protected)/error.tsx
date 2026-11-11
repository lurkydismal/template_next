"use client";

import ErrorFallback from "@/components/errors/ErrorFallback";

/** Isolates failures in protected routes from the rest of the application. */
export default function ProtectedErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return <ErrorFallback error={error} reset={reset} />;
}
