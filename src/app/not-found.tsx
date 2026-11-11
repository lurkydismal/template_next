import NextLink from "next/link";

import { userMessages } from "@/utils/messages";

/** Renders the application's not-found state. */
export default function NotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 dark:bg-gray-900">
            <section className="w-full max-w-md space-y-6 p-6 text-center">
                <p className="text-sm font-semibold tracking-widest text-indigo-600 uppercase">
                    404
                </p>
                <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {userMessages.status.notFoundTitle}
                    </h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {userMessages.status.notFoundDescription}
                    </p>
                </div>
                <NextLink
                    href="/"
                    className="inline-flex cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-900"
                >
                    {userMessages.actions.home}
                </NextLink>
            </section>
        </main>
    );
}
