"use client";

import { Button } from "@/components/RootPageButton";
import buttons from "@/data/RootPageButtons";
import { useHtmlDataDark } from "@/utils/stdhook";

/**
 * Root Page Component
 *
 * Displays a responsive grid of buttons using data from `RootPageButtons`.
 * The background and text color adapts to a dark/light theme.
 *
 * Notes:
 * - `isDark` is currently hardcoded to true; can be made dynamic for theme switching.
 * - `containerBg` sets the Tailwind CSS background and text color classes based on theme.
 * - `sr-only` heading provides accessibility for screen readers.
 * - Grid is responsive:
 *     - 1 column on small screens
 *     - 2 columns on small/medium screens
 *     - 3 columns on medium/large screens
 */
export default function Page() {
    // const isDark = useHtmlDataDark();
    const isDark = true;

    const containerBg = isDark
        ? "bg-gray-900 text-gray-100"
        : "bg-gray-50 text-gray-900";

    return (
        <main
            className={`min-h-screen flex items-center justify-center ${containerBg} p-8`}
        >
            <div className="w-full max-w-3xl">
                <h1 className="sr-only">Buttons</h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {buttons.map((button) => (
                        <Button key={button.name} {...button} isDark={isDark} />
                    ))}
                </div>
            </div>
        </main>
    );
}
