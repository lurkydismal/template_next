"use client";

import { useEffect } from "react";
import { useSnackbar } from "@/providers/snackbar";

function ErrorIcon() {
    return (
        <svg
            className="w-7 h-7 text-red-600 dark:text-red-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {/* triangle */}
            <path d="M10.29 3.86l-7.2 12.47A2 2 0 004.8 20h14.4a2 2 0 001.71-3.03l-7.2-12.47a2 2 0 00-3.42 0z" />

            {/* ! line */}
            <line x1="12" y1="9" x2="12" y2="14" />

            {/* ! dot */}
            <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
        </svg>
    );
}

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { showError } = useSnackbar();

    useEffect(() => {
        showError(error);
    }, [showError, error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <main className="w-full max-w-md p-6 space-y-6 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <ErrorIcon />
                </div>

                <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Something went wrong
                    </h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        An unexpected error occurred while loading this page.
                    </p>
                </div>

                {error?.digest && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Ref: {error.digest}
                    </p>
                )}

                <button
                    onClick={() => reset()}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition cursor-pointer"
                >
                    Try again
                </button>
            </main>
        </div>
    );
}
