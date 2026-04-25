import NextLink from "next/link";

function LockIcon() {
    return (
        <svg
            className="w-7 h-7 text-amber-600 dark:text-amber-400"
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

export default function Forbidden() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <main className="w-full max-w-md p-6 space-y-6 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
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
                    className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition cursor-pointer"
                >
                    Landing Page
                </NextLink>
            </main>
        </div>
    );
}
