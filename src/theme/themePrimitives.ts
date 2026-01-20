import { Shadows, alpha, createTheme } from "@mui/material/styles";

// Extend MUI Paper component props to add a custom "highlighted" variant
declare module "@mui/material/Paper" {
    interface PaperPropsVariantOverrides {
        highlighted: true;
    }
}

// Extend MUI theme types
declare module "@mui/material/styles" {
    // Define a color range with shades 50–900 for consistent palette usage
    interface ColorRange {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    }

    // interface PaletteColor extends ColorRange {}

    // Add a custom property for a base shadow used throughout the app
    interface Palette {
        baseShadow: string;
    }
}

// Create default MUI theme to use helper functions like pxToRem
const defaultTheme = createTheme();

// Define color palettes for brand, gray, green, orange, red
export const brand = {
    50: "hsl(210, 100%, 95%)",
    100: "hsl(210, 100%, 92%)",
    200: "hsl(210, 100%, 80%)",
    300: "hsl(210, 100%, 65%)",
    400: "hsl(210, 98%, 48%)",
    500: "hsl(210, 98%, 42%)",
    600: "hsl(210, 98%, 55%)",
    700: "hsl(210, 100%, 35%)",
    800: "hsl(210, 100%, 16%)",
    900: "hsl(210, 100%, 21%)",
};

export const gray = {
    50: "hsl(220, 35%, 97%)",
    100: "hsl(220, 30%, 94%)",
    200: "hsl(220, 20%, 88%)",
    300: "hsl(220, 20%, 80%)",
    400: "hsl(220, 20%, 65%)",
    500: "hsl(220, 20%, 42%)",
    600: "hsl(220, 20%, 35%)",
    700: "hsl(220, 20%, 25%)",
    800: "hsl(220, 30%, 6%)",
    900: "hsl(220, 35%, 3%)",
};

export const green = {
    50: "hsl(120, 80%, 98%)",
    100: "hsl(120, 75%, 94%)",
    200: "hsl(120, 75%, 87%)",
    300: "hsl(120, 61%, 77%)",
    400: "hsl(120, 44%, 53%)",
    500: "hsl(120, 59%, 30%)",
    600: "hsl(120, 70%, 25%)",
    700: "hsl(120, 75%, 16%)",
    800: "hsl(120, 84%, 10%)",
    900: "hsl(120, 87%, 6%)",
};

export const orange = {
    50: "hsl(45, 100%, 97%)",
    100: "hsl(45, 92%, 90%)",
    200: "hsl(45, 94%, 80%)",
    300: "hsl(45, 90%, 65%)",
    400: "hsl(45, 90%, 40%)",
    500: "hsl(45, 90%, 35%)",
    600: "hsl(45, 91%, 25%)",
    700: "hsl(45, 94%, 20%)",
    800: "hsl(45, 95%, 16%)",
    900: "hsl(45, 93%, 12%)",
};

export const red = {
    50: "hsl(0, 100%, 97%)",
    100: "hsl(0, 92%, 90%)",
    200: "hsl(0, 94%, 80%)",
    300: "hsl(0, 90%, 65%)",
    400: "hsl(0, 90%, 40%)",
    500: "hsl(0, 90%, 30%)",
    600: "hsl(0, 91%, 25%)",
    700: "hsl(0, 94%, 18%)",
    800: "hsl(0, 95%, 12%)",
    900: "hsl(0, 93%, 6%)",
};

// Define light and dark color schemes for the app
export const colorSchemes = {
    light: {
        palette: {
            primary: {
                contrastText: brand[50],
                dark: brand[700],
                light: brand[200],
                main: brand[400],
            },
            info: {
                contrastText: gray[50],
                dark: brand[600],
                light: brand[100],
                main: brand[300],
            },
            warning: {
                dark: orange[800],
                light: orange[300],
                main: orange[400],
            },
            error: {
                dark: red[800],
                light: red[300],
                main: red[400],
            },
            success: {
                dark: green[800],
                light: green[300],
                main: green[400],
            },
            grey: {
                ...gray,
            },
            divider: alpha(gray[300], 0.4), // semi-transparent divider
            background: {
                default: "hsl(0, 0%, 99%)",
                paper: "hsl(220, 35%, 97%)",
            },
            text: {
                primary: gray[800],
                secondary: gray[600],
                warning: orange[400],
            },
            action: {
                hover: alpha(gray[200], 0.2),
                selected: `${alpha(gray[200], 0.3)}`,
            },
            baseShadow:
                "hsla(220, 30%, 5%, 0.07) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.07) 0px 8px 16px -5px",
        },
    },
    dark: {
        palette: {
            primary: {
                contrastText: brand[50],
                dark: brand[700],
                light: brand[300],
                main: brand[400],
            },
            info: {
                contrastText: brand[300],
                dark: brand[900],
                light: brand[500],
                main: brand[700],
            },
            warning: {
                dark: orange[700],
                light: orange[400],
                main: orange[500],
            },
            error: {
                dark: red[700],
                light: red[400],
                main: red[500],
            },
            success: {
                dark: green[700],
                light: green[400],
                main: green[500],
            },
            grey: {
                ...gray,
            },
            divider: alpha(gray[700], 0.6),
            background: {
                default: gray[900],
                paper: "hsl(220, 30%, 7%)",
            },
            text: {
                primary: "hsl(0, 0%, 100%)",
                secondary: gray[400],
            },
            action: {
                hover: alpha(gray[600], 0.2),
                selected: alpha(gray[600], 0.3),
            },
            baseShadow:
                "hsla(220, 30%, 5%, 0.7) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.8) 0px 8px 16px -5px",
        },
    },
};

// Define typography styles based on default theme
export const typography = {
    fontFamily: "var(--font-main)",
    h1: {
        fontSize: defaultTheme.typography.pxToRem(48),
        fontWeight: 600,
        letterSpacing: -0.5,
        lineHeight: 1.2,
    },
    h2: {
        fontSize: defaultTheme.typography.pxToRem(36),
        fontWeight: 600,
        lineHeight: 1.2,
    },
    h3: {
        fontSize: defaultTheme.typography.pxToRem(30),
        lineHeight: 1.2,
    },
    h4: {
        fontSize: defaultTheme.typography.pxToRem(24),
        fontWeight: 600,
        lineHeight: 1.5,
    },
    h5: {
        fontSize: defaultTheme.typography.pxToRem(20),
        fontWeight: 600,
    },
    h6: {
        fontSize: defaultTheme.typography.pxToRem(18),
        fontWeight: 600,
    },
    subtitle1: {
        fontSize: defaultTheme.typography.pxToRem(18),
    },
    subtitle2: {
        fontSize: defaultTheme.typography.pxToRem(14),
        fontWeight: 500,
    },
    body1: {
        fontSize: defaultTheme.typography.pxToRem(14),
    },
    body2: {
        fontSize: defaultTheme.typography.pxToRem(14),
        fontWeight: 400,
    },
    caption: {
        fontSize: defaultTheme.typography.pxToRem(12),
        fontWeight: 400,
    },
};

// Define global shape settings
export const shape = {
    borderRadius: 8,
};

// Override default MUI shadows with a custom base shadow for the app
// @ts-expect-error TS type mismatch with defaultTheme.shadows
const defaultShadows: Shadows = [
    "none",
    "var(--template-palette-baseShadow)", // use custom base shadow
    ...defaultTheme.shadows.slice(2),
];

export const shadows = defaultShadows;
