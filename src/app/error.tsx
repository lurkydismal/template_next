"use client";

import ErrorFallback from "@/components/errors/ErrorFallback";

/** Root route-segment error boundary. */
export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return <ErrorFallback error={error} reset={reset} />;
}
