/**
 * Utility functions for server and client use.
 */

/**
 * Get an environment variable or return a default if missing.
 *
 * @param key - Environment variable name
 * @param defaultValue - Optional default value to use if the env var is missing
 * @returns Value of the environment variable, or the default if provided
 * @throws Error if the variable is missing and no default is provided
 */
export function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];

    if (value !== undefined) {
        return value;
    }

    if (defaultValue !== undefined) {
        return defaultValue;
    }

    console.error(`Environment variable "${key}" is not set`);
    throw new Error(`Missing environment variable: ${key}`);
}

/**
 * Parse a string into boolean.
 * Accepts "true", "1", "yes" (case-sensitive) as true. Everything else is false.
 *
 * @example
 * parseBool("true"); // true
 * parseBool("1"); // true
 * parseBool("false"); // false
 */
export function parseBool(value: string): boolean {
    return value === "true" || value === "1" || value === "yes";
}

/**
 * Convert a string to camelCase.
 * - Trims and lowercases
 * - Removes special characters except spaces
 * - Converts words after spaces to uppercase
 */
export function toCamelCase(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/[^a-z0-9 ]+/g, "")
        .replace(/\s+/g, " ")
        .replace(/\s+([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/**
 * Convert a string to PascalCase.
 *
 * Rules:
 * - Trims whitespace
 * - Removes special characters except letters and numbers
 * - Splits on spaces, hyphens, and underscores
 * - Capitalizes the first letter of each word
 *
 * Examples:
 * "hello world"     → "HelloWorld"
 * "  user_name  "   → "UserName"
 * "foo-bar-baz"     → "FooBarBaz"
 * "FOO 2 bar!"      → "Foo2Bar"
 *
 * @param text - The input string
 * @returns PascalCase version of the string
 *
 * @example
 * toPascalCase("release notes"); // "ReleaseNotes"
 */
export function toPascalCase(text: string): string {
    if (!text) return "";

    return (
        text
            .trim()
            .toLowerCase()
            // Replace each non-alphanumeric separator with a single space
            .replace(/[\s-_]+/g, " ")
            // Remove remaining non-alphanumeric characters
            .replace(/[^a-z0-9 ]+/g, "")
            // Split by spaces, capitalize each word, join
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join("")
    );
}

/**
 * Type guard to check if an input is a plain object (Record<string, unknown>).
 *
 * @param input - The value to check
 * @returns True if input is a plain object
 *
 * @example
 * isRecord({ id: 1 }); // true
 * isRecord([1, 2, 3]); // false
 */
export function isRecord(input: unknown): input is Record<string, unknown> {
    if (typeof input !== "object" || input === null) return false;

    const proto = Object.getPrototypeOf(input);
    return proto === Object.prototype || proto === null;
}

/**
 * Type guard for Blob objects.
 *
 * @param v - Value to check
 * @returns True if v is a Blob instance
 *
 * @example
 * isBlob(new Blob(["hello"])); // true
 * isBlob("hello"); // false
 */
export function isBlob(v: unknown): v is Blob {
    return v instanceof Blob;
}

/**
 * Extract a value from FormData, Record, or return raw value.
 *
 * @template T - Expected type
 * @param input - FormData, Record, or raw value
 * @param key - Key to extract if input is FormData or Record
 * @returns Extracted value or undefined
 *
 * @example
 * extractFromFormData({ email: "a@b.com" }, "email"); // "a@b.com"
 */
export function extractFromFormData<T = unknown>(
    input: FormData | Record<string, unknown> | unknown,
    key: string,
): T | undefined {
    if (input instanceof FormData) {
        const value = input.get(key);
        return value === null ? undefined : (value as T);
    }

    if (isRecord(input)) {
        if (!key) return undefined;
        return input[key] as T | undefined;
    }

    return input as T | undefined;
}

/**
 * Delay execution for a specified number of milliseconds.
 * - Validates input to avoid invalid or excessive delays.
 *
 * @example
 * await delay(150);
 */
export function delay(milliseconds: number): Promise<void> {
    const ms = Number(milliseconds);

    // Validate delay to avoid unbounded timers from untrusted input
    if (!Number.isFinite(ms) || ms < 0) {
        throw new Error(`Invalid delay value: ${milliseconds}`);
    }

    // Enforce an upper bound and pass only a sanitized integer to the timer sink
    const MAX_DELAY_MS = 60_000; // 1 minute
    const safeDelayMs = Math.min(Math.floor(ms), MAX_DELAY_MS);

    return new Promise((resolve) => setTimeout(resolve, safeDelayMs));
}

/**
 * Paginate an array of items.
 *
 * @template T - Array element type
 * @param items - Array of items to paginate
 * @param currentPage - 1-based page number
 * @param perPage - Number of items per page
 * @returns Slice of items for the current page
 *
 * @example
 * paginate(["a", "b", "c", "d"], 2, 2); // ["c", "d"]
 */
export function paginate<T>(
    items: T[],
    currentPage: number,
    perPage: number,
): T[] {
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;

    return items.slice(start, end);
}

/**
 * A utility function that normalizes a value or the first element of an array.
 *
 * This function checks if the input `item` is an array. If it is, the function returns the first element of the array.
 * If the input is a single value (not an array), the function returns the value itself.
 *
 * @template T - The type of the value that is passed in. This can be an arbitrary type, and it can also be an array of that type.
 * @param item - The value to be normalized. It can either be a single value of type `T` or an array of values of type `T[]`.
 * @returns The normalized value: if `item` is an array, it returns the first element (`item[0]`), otherwise it returns `item` itself.
 *
 * @example
 * // If the input is an array, return the first element.
 * normalizeArrayOrValue([1, 2, 3]); // Returns: 1
 *
 * // If the input is a single value, return the value itself.
 * normalizeArrayOrValue(5); // Returns: 5
 */
export function normalizeArrayOrValue<T>(item: T | T[]): T {
    return Array.isArray(item) ? item[0] : item;
}

/**
 * Mapped type that unwraps promise-like values in an object shape.
 *
 * @example
 * type Input = { id: Promise<number>; name: string };
 * type Output = AwaitedObject<Input>; // { id: number; name: string }
 */
type AwaitedObject<T extends Record<PropertyKey, unknown>> = {
    [K in keyof T]: Awaited<T[K]>;
};

/**
 * Resolves all values in an object while preserving keys and inferred types.
 *
 * This is useful when composing multiple async operations into one payload
 * that should be awaited as a group.
 *
 * @example
 * const result = await awaitObject({
 *   users: Promise.resolve(["alice"]),
 *   count: Promise.resolve(1),
 * });
 * // result => { users: ["alice"], count: 1 }
 */
export async function awaitObject<T extends Record<PropertyKey, unknown>>(
    obj: T,
): Promise<AwaitedObject<T>> {
    const entries = Object.entries(obj);

    const resolved = await Promise.all(
        entries.map(async ([key, value]) => {
            return [key, await value] as const;
        }),
    );

    return Object.fromEntries(resolved) as AwaitedObject<T>;
}
