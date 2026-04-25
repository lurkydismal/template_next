import NextLink from "next/link";

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
            {/* Circle */}
            <circle cx="12" cy="12" r="10" />
            {/* Exclamation mark vertical line */}
            <line x1="12" y1="7" x2="12" y2="13" />
            {/* Exclamation mark dot */}
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <main className="w-full max-w-md p-6 space-y-6 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <ErrorIcon />
                </div>

                <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Not signed in
                    </h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        You need to log in to access this page.
                    </p>
                </div>

                <NextLink
                    href="/auth/login"
                    className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition cursor-pointer"
                >
                    Sign in
                </NextLink>
            </main>
        </div>
    );
}
