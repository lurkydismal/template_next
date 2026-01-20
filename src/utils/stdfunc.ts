/**
 * Get an environment variable, or throw/log error if not set.
 * @param key - The environment variable name
 * @returns The environment variable value as string
 * @throws Error if the environment variable is missing
 */
export function getEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        console.error(`Environment variable "${key}" is not set`);
        throw new Error(`Missing environment variable: ${key}`);
    }
    return value;
}

/**
 * Parse a string value into a boolean.
 * - Recognizes `"true"`, `"1"`, and `"yes"` as true.
 * - All other values are false.
 *
 * @param value - String to parse
 * @returns Boolean representation
 */
export function parseBool(value: string) {
    return value === "true" || value === "1" || value === "yes";
}

/**
 * Encode a URL/path segment safely.
 * - Splits the path by "/" and encodes each segment individually.
 * - Filters out empty segments to avoid duplicate slashes.
 *
 * @param path - The path string to encode
 * @returns Encoded path string safe for URLs
 */
export function encodePath(path: string): string {
    return path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

/**
 * Sanitize a filename string to be safe for file systems.
 * - Converts spaces to underscores
 * - Replaces unsafe characters with underscores
 * - Removes leading dots
 * - Truncates to 100 characters
 * - Converts to lowercase
 *
 * @param raw - Input value to sanitize
 * @returns Sanitized filename or `null` if input is invalid or empty
 */
export function sanitizeFilename(raw: unknown): string | null {
    if (typeof raw !== "string") return null;

    const s = raw
        .trim()
        .replace(/\s+/g, "_") // spaces → _
        .replace(/[^a-zA-Z0-9_\-\.]/g, "_") // replace unsafe chars
        .replace(/^\.+/, "") // remove leading dots
        .slice(0, 100) // max length 100
        .toLowerCase();

    return s || null;
}

/**
 * Convert a string into camelCase.
 * - Trims and lowercases the input
 * - Removes special characters (except spaces)
 * - Converts words after spaces into uppercase to form camelCase
 *
 * Example: `"Folder Title"` → `"folderTitle"`
 *
 * @param header - The input string
 * @returns The camelCase
 */
export function toCamelCase(header: string): string {
    return (
        header
            .trim()
            .toLowerCase()
            // Remove special chars (keep spaces)
            .replace(/[^a-z0-9 ]+/g, "")
            .replace(/\s+([a-z0-9])/g, (_, c) => c.toUpperCase())
    );
}

/**
 * Extract a value from FormData or return the raw input.
 *
 * - If `input` is a FormData instance, get the value for the given `key`.
 * - Returns `undefined` if the key is not present or the value is `null`.
 * - If `input` is not FormData, assumes it is already the raw value and returns it.
 *
 * @template T - Expected type of the value
 * @param input - The input, either a raw value or FormData
 * @param key - The key to extract from FormData
 * @returns The extracted value or undefined
 */
export function extractFromFormData<T = unknown>(
    input: unknown,
    key: string,
): T | undefined {
    if (input instanceof FormData) {
        const value = input.get(key);

        return value === null ? undefined : (value as T);
    }

    return input as T | undefined;
}

/**
 * Delay execution by a specified number of milliseconds.
 * - Returns a Promise that resolves after the timeout.
 *
 * @param milliseconds - Time to wait in milliseconds
 * @returns Promise that resolves after the delay
 */
export function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
