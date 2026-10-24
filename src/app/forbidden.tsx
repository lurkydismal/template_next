import NextLink from "next/link";

/**
 * Renders the lock icon component.
 */
function LockIcon() {
    return (
        <svg
            className="h-7 w-7 text-amber-600 dark:text-amber-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {/* shackle */}
            <path d="M5 11V7a7 7 0 0114 0v4" />

            {/* body */}
            <rect x="3" y="11" width="18" height="10" rx="2" />

            {/* keyhole */}
            <circle cx="12" cy="15" r="1.5" />
            <path d="M12 16.5v2" />
        </svg>
    );
}

/**
 * Renders the forbidden component.
 */
export default function Forbidden() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <main className="w-full max-w-md space-y-6 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <LockIcon />
                </div>

                <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Access denied
                    </h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        You don’t have permission to view this page.
                    </p>
                </div>

                <NextLink
                    href="/"
                    className="cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-900"
                >
                    Landing Page
                </NextLink>
            </main>
        </div>
    );
}
