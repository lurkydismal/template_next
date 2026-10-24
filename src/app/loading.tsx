"use client";

import { useEffect, useState } from "react";

/**
 * Renders the loading component.
 */
export default function Loading() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setProgress((p) => Math.min(p + Math.random() * 10, 95));
        }, 300);

        // when component unmounts (Suspense resolved), jump to 100%
        return () => {
            clearInterval(id);
            setProgress(100);
        };
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <main className="w-full max-w-3xl space-y-6 p-6">
                {/* header + spinner */}
                <div className="flex items-center gap-4">
                    <svg
                        role="status"
                        aria-hidden="true"
                        className="h-10 w-10 animate-spin text-indigo-600"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                    </svg>
                    <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Loading content
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Preparing your view…
                        </p>
                    </div>
                    <span className="sr-only">Loading</span>
                </div>

                {/* grid of skeleton cards */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <article
                            key={i}
                            className="animate-pulse rounded-lg border border-transparent bg-white p-4 shadow-sm dark:border-gray-700/40 dark:bg-gray-800"
                            aria-hidden
                        >
                            <div className="h-40 rounded-md bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-4 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                        </article>
                    ))}
                </section>

                {/* subtle progress + status */}
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                            <div
                                className="h-2 rounded-full bg-indigo-600/80 transition-all"
                                style={{ width: `${progress}%` }}
                                aria-hidden
                            />
                        </div>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Loading resources — this usually takes a second.
                        </div>
                    </div>

                    <div className="hidden items-center gap-2 sm:flex">
                        <div className="h-3 w-3 animate-pulse rounded-full bg-indigo-600" />
                        <div className="h-3 w-3 animate-pulse rounded-full bg-indigo-600/70" />
                        <div className="h-3 w-3 animate-pulse rounded-full bg-indigo-600/50" />
                    </div>
                </div>
            </main>
        </div>
    );
}
