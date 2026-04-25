"use client";

import { useEffect, useState } from "react";

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <main className="w-full max-w-3xl p-6 space-y-6">
                {/* header + spinner */}
                <div className="flex items-center gap-4">
                    <svg
                        role="status"
                        aria-hidden="true"
                        className="w-10 h-10 text-indigo-600 animate-spin"
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
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <article
                            key={i}
                            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-transparent dark:border-gray-700/40 animate-pulse"
                            aria-hidden
                        >
                            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-md" />
                            <div className="mt-4 h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                            <div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        </article>
                    ))}
                </section>

                {/* subtle progress + status */}
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-2 bg-indigo-600/80 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                                aria-hidden
                            />
                        </div>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Loading resources — this usually takes a second.
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse" />
                        <div className="w-3 h-3 rounded-full bg-indigo-600/70 animate-pulse" />
                        <div className="w-3 h-3 rounded-full bg-indigo-600/50 animate-pulse" />
                    </div>
                </div>
            </main>
        </div>
    );
}
