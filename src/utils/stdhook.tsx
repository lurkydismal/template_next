import { useEffect, useState } from "react";

/**
 * React hook to track whether the `<html>` element has the `data-dark` attribute.
 *
 * - Returns a boolean indicating if dark mode is currently enabled based on the HTML attribute.
 * - Initializes state by checking `document.documentElement` safely (works with SSR fallback).
 * - Sets up a `MutationObserver` to detect changes to the `data-dark` attribute in real-time.
 * - Automatically updates the state when the attribute is added or removed.
 *
 * @returns `true` if the `<html>` element has the `data-dark` attribute, `false` otherwise
 */
export function useHtmlDataDark(): boolean {
    // State initialized lazily to avoid SSR issues
    const [isDark, setIsDark] = useState<boolean>(() => {
        try {
            return (
                typeof document !== "undefined" &&
                document.documentElement.hasAttribute("data-dark")
            );
        } catch {
            return false;
        }
    });

    useEffect(() => {
        const html = document.documentElement;

        // Function to read current state of `data-dark` attribute
        const read = () => setIsDark(html.hasAttribute("data-dark"));
        read();

        // Observe changes to the HTML element's attributes
        const obs = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (
                    m.type === "attributes" &&
                    m.attributeName === "data-dark"
                ) {
                    read();
                    break;
                }
            }
        });

        // Start observing only the `data-dark` attribute
        obs.observe(html, { attributes: true, attributeFilter: ["data-dark"] });

        // Cleanup observer on unmount
        return () => obs.disconnect();
    }, []);

    return isDark;
}
