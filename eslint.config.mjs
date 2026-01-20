import { defineConfig, globalIgnores } from "eslint/config";
import eslintPluginPerfectionist from 'eslint-plugin-perfectionist';
import eslintPluginDrizzle from 'eslint-plugin-drizzle';
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,

    // Perfectionist rules
    {
        files: ["*.ts", "*.tsx", "*.js", "*.jsx"],
        plugins: {
            perfectionist: eslintPluginPerfectionist,
            drizzle: eslintPluginDrizzle,
        },
        rules: {
            // Sort imports
            "perfectionist/sort-imports": [
                "error",
                {
                    type: "natural",        // "natural" alphabetical sort
                    groups: [
                        "builtin",
                        "external",
                        "internal",
                        "parent",
                        "sibling",
                        "index"
                    ],
                    newlinesBetween: 1, // Add a newline between groups
                },
            ],

            // Sort object keys
            "perfectionist/sort-objects": ["error", { order: "asc", ignoreCase: false }],

            // Sort JSX props
            "perfectionist/sort-jsx-props": ["error", { order: "asc", newlinesBetween: 0 }],

            "react/jsx-sort-props": ["error", { callbacksLast: true, ignoreCase: true }],

            "drizzle/enforce-delete-with-where": "error",
            "drizzle/enforce-update-with-where": "error",
        },
    },

    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
        "drizzle/**",
        'public/**',
        "**/*.js",
        "./*.ts",
    ]),
]);

export default eslintConfig;
