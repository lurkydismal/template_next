import { Color } from "@/utils/stdvar";
import Link from "next/link";

/**
 * Defines the shape of a button configuration.
 * - `name`: Display text for the button.
 * - `color`: Optional variant color key, defaults to "default" aka "primary".
 * - `href`: URL the button links to.
 */
export type ButtonDefinition = {
    name: string;
    color?: Color;
    href: string;
};

/**
 * Represents Tailwind CSS classes for light and dark themes.
 * Used for deterministic styling based on dark mode detection.
 */
export type VariantClass = { light: string; dark: string };

/**
 * Reusable primary variant classes.
 * Contains explicit light and dark mode Tailwind strings.
 */
const primaryVariant: VariantClass = {
    light: "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-300",
    dark: "bg-sky-800 text-white hover:bg-sky-600 focus:ring-sky-400",
};

/**
 * Maps each color variant to its corresponding light and dark mode classes.
 * - Keys must match the `Color` type.
 * - The `default` variant reuses the primary variant.
 *
 * Note:
 * Tailwind's `dark:` class is not toggled here.
 * We read `data-dark` on <html> and apply the appropriate classes at runtime.
 */
const variantClasses: Record<Color, VariantClass> = {
    primary: primaryVariant,
    warning: {
        light: "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-300",
        dark: "bg-amber-800 text-white hover:bg-amber-600 focus:ring-amber-300",
    },
    error: {
        light: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-300",
        dark: "bg-rose-800 text-white hover:bg-rose-600 focus:ring-rose-400",
    },
    success: {
        light: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300",
        dark: "bg-emerald-800 text-white hover:bg-emerald-600 focus:ring-emerald-400",
    },
    secondary: {
        light: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300",
        dark: "bg-gray-700 text-gray-100 hover:bg-gray-500 focus:ring-gray-600",
    },
    info: {
        light: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-300",
        dark: "bg-indigo-700 text-white hover:bg-indigo-500 focus:ring-indigo-400",
    },
    default: primaryVariant,
};

/**
 * Renders a styled button using Tailwind CSS classes.
 *
 * Props:
 * - `name`: Button label text.
 * - `color`: Optional variant, defaults to "primary".
 * - `href`: Link target.
 * - `isDark`: Determines if dark mode classes should be applied.
 *
 * Implementation:
 * - `base` holds common Tailwind styling for layout, typography, and focus.
 * - `variant` selects the appropriate color variant from `variantClasses`.
 * - `classes` combines base styles with light/dark variant.
 * - Returns a Next.js <Link> with `aria-label` set for accessibility.
 */
export function Button({
    name,
    color = "default",
    href,
    isDark,
}: ButtonDefinition & { isDark: boolean }) {
    const base =
        "inline-flex items-center justify-center px-4 py-2 rounded-md font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
    const variant: VariantClass =
        variantClasses[color as Color] ?? variantClasses.default;
    const classes = `${base} ${isDark ? variant.dark : variant.light}`;

    return (
        <Link href={href} className={classes} aria-label={name}>
            {name}
        </Link>
    );
}
