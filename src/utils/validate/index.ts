import {
    contentSchema,
    idSchema,
    dateInputSchema,
    filenameSchema,
    fileSchema,
    pathSchema,
} from "./schemas";
import { extractFromFormData } from "@/utils/stdfunc";

/**
 * Validate a date input from a generic value or FormData.
 *
 * - Extracts the value associated with the key "date" if input is FormData.
 * - Passes the extracted value through `dateInputSchema` to validate
 *   and normalize it.
 *
 * @param input - The input to validate; can be any value or FormData.
 * @returns A Day.js instance representing the validated date.
 * @throws Throws if the input is invalid or cannot be parsed as a date.
 */
export function validateDate(input?: unknown | FormData) {
    const value = extractFromFormData(input, "date");

    return dateInputSchema.parse(value);
}

/**
 * Validate and sanitize a filename.
 *
 * - Supports both raw values and FormData inputs.
 * - Uses the `filenameSchema` to sanitize and validate.
 * - Throws if the filename is invalid after sanitization.
 *
 * @param input - The filename or FormData containing a "filename" key
 * @returns The sanitized filename as a string
 */
export function validateFilename(input?: unknown | FormData): string {
    const value = extractFromFormData(input, "filename");

    return filenameSchema.parse(value);
}

/**
 * Validate a path string.
 *
 * - Supports both raw values and FormData inputs.
 * - Uses the `pathSchema` to validate formatting rules:
 *   - Must not start with '/'
 *   - No backslashes
 *   - No '..' parent traversal
 *   - Ensures trailing slash
 * - Throws if the path is invalid.
 *
 * @param input - The path string or FormData containing a "path" key
 * @returns The validated path string
 */
export function validatePath(input?: unknown | FormData): string {
    const value = extractFromFormData(input, "path");

    return pathSchema.parse(value);
}

/**
 * Validate a file-like object asynchronously.
 *
 * - Supports both raw values and FormData inputs.
 * - Default FormData key is "file" but can be overridden.
 * - Uses `fileSchema` to validate:
 *   - Must have `arrayBuffer()` function
 *   - Must have a valid MIME type starting with "image/"
 *   - Size must be <= maxImageSize
 *   - Async check for JPEG magic bytes
 *
 * @param input - The file object or FormData containing a file
 * @param key - The key to extract from FormData (default: "file")
 * @returns A validated file object
 */
export async function validateFile(
    input?: unknown | FormData,
    key: string = "file",
) {
    const value = extractFromFormData(input, key);

    return await fileSchema.parseAsync(value);
}

/**
 * Validate an entire upload input.
 *
 * - Accepts either:
 *   - A plain object: `{ filename, file, path }`
 *   - A FormData instance
 * - Reuses the individual helpers for filename, path, and file.
 * - Path is optional; if validation fails, it returns `undefined`.
 * - File validation runs async refinements (e.g., JPEG magic bytes check).
 *
 * @param input - Upload input as a plain object or FormData
 * @returns An object containing:
 *   - `filename`: sanitized string
 *   - `path`: validated string or undefined
 *   - `file`: validated file object
 */
export async function validateUploadInput(
    input: { filename?: unknown; file?: unknown; path?: unknown } | FormData,
) {
    const filename = validateFilename(input);
    const path = (() => {
        try {
            return validatePath(input);
        } catch {
            return undefined; // optional path
        }
    })();
    const file = await validateFile(input);

    return { filename, path, file };
}

// TODO: Document
export function validateId(input?: unknown | FormData) {
    const value = extractFromFormData(input, "id");

    return idSchema.parse(value);
}

// TODO: Document
export function validateContent(input?: unknown | FormData) {
    const value = extractFromFormData(input, "content");

    return contentSchema.parse(value);
}

// TODO: Document
export async function validateRow(
    input:
        | {
            id?: unknown;
            content?: unknown;
        }
        | FormData,
) {
    const id = (() => {
        try {
            return validateId(input);
        } catch {
            return undefined; // optional id
        }
    })();
    const content = validateContent(input);

    return { id, content };
}
