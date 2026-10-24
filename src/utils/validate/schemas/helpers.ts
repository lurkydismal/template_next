import { fileTypeSignatures } from "@/utils/stdvar";

/**
 * Normalizes path separators so validation can be applied consistently.
 *
 * @param path - Raw user-provided path.
 * @returns Path with Windows separators converted to POSIX style.
 */
export function normalizePathSeparators(path: string): string {
    return path.replace(/\\+/g, "/");
}

/**
 * Returns true when a path looks like it attempts traversal.
 *
 * Detects:
 * - literal ".." segments
 * - URL-encoded dot-dot forms like "%2e%2e"
 *
 * @param path - Normalized path candidate.
 * @returns Whether traversal-like segments were found.
 */
export function hasParentTraversal(path: string): boolean {
    const decodedPath = safeDecodeURIComponent(path)
        .toLowerCase()
        .replace(/\\+/g, "/");

    return decodedPath
        .split("/")
        .some((segment) => segment === ".." || segment.includes("%2e%2e"));
}

/**
 * Safely decodes URI component values.
 *
 * Returns the original input when decoding fails so callers can continue
 * validation without throwing.
 *
 * @param value - URI-encoded value.
 * @returns Decoded value when possible; otherwise original value.
 */
export function safeDecodeURIComponent(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/**
 * Appends a single trailing slash to a path when missing.
 *
 * @param path - Validated path.
 * @returns Path ending with exactly one trailing slash.
 */
export function ensureTrailingSlash(path: string): string {
    const trimmed = path.replace(/\/+$/g, "");
    return `${trimmed}/`;
}

/**
 * Detects the MIME type from file signature bytes.
 *
 * Supports common web image formats and returns `null` when the signature is
 * unknown.
 *
 * @param bytes - File content bytes.
 * @returns Detected MIME type or `null` if not recognized.
 */
export function detectImageMimeType(bytes: Uint8Array): string | null {
    return (
        fileTypeSignatures.find((signature) => signature.matches(bytes))
            ?.mimeType ?? null
    );
}
