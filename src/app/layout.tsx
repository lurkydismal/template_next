/**
 * Root Layout Component
 *
 * This file defines the root layout for the Next.js application.
 * It sets up global styles, fonts, metadata, and UI providers.
 *
 * Features:
 * - Imports global CSS (`globals.css`) and Tailwind for utility styles.
 * - Uses the Geist Mono Google Font with CSS variable for consistent typography.
 * - Provides application metadata (title and description) using Next.js Metadata API.
 * - Initializes MUI color scheme script for dark/light mode support.
 * - Wraps children with `AppRouterCacheProvider` from MUI for optimized caching in Next.js App Router (v16).
 * - Logs current build environment (development or production) using a custom logger.
 *
 * Notes:
 * - `font.variable` sets a CSS variable `--font-nain` for use across the app.
 * - `InitColorSchemeScript` ensures proper MUI theme handling on first load.
 * - `AppRouterCacheProvider` is configured with `enableCssLayer: true` to optimize style insertion.
 */

import type { Metadata } from "next";
import { InitColorSchemeScript } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import log from "@/utils/stdlog";
import { isDev, appName, appVersion } from "@/utils/stdvar";

// Configure Geist Mono font with CSS variable for global usage
const font = Geist_Mono({
    variable: "--font-nain",
    subsets: ["latin"],
    display: "swap",
});

// Metadata for the Next.js app, used for <head> tags and SEO
export const metadata: Metadata = {
    title: appName,
    description: appVersion,
};

// Log the current build environment (development or production)
log.info(`Running ${isDev ? "DEVELOPMENT" : "PRODUCTION"} build`);

/**
 * RootLayout Component
 *
 * Wraps the entire Next.js app with global providers, fonts, and layout structure.
 *
 * Props:
 * - children: React.ReactNode - all nested page and component content
 *
 * Structure:
 * - <html lang="en"> with global font variable applied
 * - <body> contains:
 *     - InitColorSchemeScript: ensures proper MUI theme handling
 *     - AppRouterCacheProvider: optimizes caching for MUI styles in Next.js App Router
 */
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${font.variable}`}>
            <body>
                <InitColorSchemeScript attribute="data" />

                <AppRouterCacheProvider options={{ enableCssLayer: true }}>
                    {children}
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}
