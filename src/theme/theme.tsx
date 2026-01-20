"use client";

import { ReactNode } from "react";
import type { ThemeOptions } from "@mui/material/styles";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
    colorSchemes,
    shadows,
    shape,
    typography,
} from "@/theme/themePrimitives";
import useMediaQuery from "@mui/material/useMediaQuery";
import * as DG from "@mui/x-data-grid/locales";
import * as DP from "@mui/x-date-pickers/locales";
import * as MUI from "@mui/material/locale";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

// Props for AppTheme wrapper
export interface AppThemeProps {
    children?: ReactNode;
    themeComponents?: ThemeOptions["components"]; // Optional overrides for MUI component styles
}

// Main AppTheme component providing theme and localization
export default function AppTheme(props: AppThemeProps) {
    const { children, themeComponents } = props;
    const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

    // Get user's browser locale (e.g., "en-US") and extract language code ("en")
    const userLocale = navigator.language || "en-US";
    const lang = userLocale.split("-")[0];

    // Function to fetch localized messages for MUI components, DataGrid, and DatePicker
    // with a fallback to enUS
    const getLocales = (localeName: string) => ({
        mui: (MUI as Record<string, typeof MUI.enUS>)[localeName] || MUI.enUS,
        dg:
            (DG as unknown as Record<string, typeof DG.enUS>)[localeName] ||
            DG.enUS,
        dp:
            (DP as unknown as Record<string, typeof DP.enUS>)[localeName] ||
            DP.enUS,
    });

    // Destructure the selected locales
    const { mui, dg, dp } = getLocales(lang);

    // Create MUI theme with custom primitives, dark/light mode, and localization
    const theme = createTheme(
        {
            palette: {
                mode: prefersDarkMode ? "dark" : "light",
            },
            cssVariables: {
                colorSchemeSelector: "data",
            },
            typography,
            colorSchemes,
            shadows,
            shape,
            components: {
                ...themeComponents, // merge any user-provided component overrides
            },
        },
        mui, // apply MUI core locale
        dg, // apply DataGrid locale
        dp, // apply DatePicker locale
    );

    // Render ThemeProvider and LocalizationProvider wrapping the app's children
    return (
        <ThemeProvider theme={theme} disableTransitionOnChange>
            <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale={lang}
            >
                {children}
            </LocalizationProvider>
        </ThemeProvider>
    );
}
