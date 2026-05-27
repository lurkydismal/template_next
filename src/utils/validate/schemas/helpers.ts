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
    const decodedPath = safeDecodeURIComponent(path).toLowerCase();

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
    if (bytes.length < 12) return null;

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return "image/jpeg";
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
    ) {
        return "image/png";
    }

    // GIF87a / GIF89a
    if (
        bytes[0] === 0x47 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x38 &&
        (bytes[4] === 0x37 || bytes[4] === 0x39) &&
        bytes[5] === 0x61
    ) {
        return "image/gif";
    }

    // WebP: RIFF....WEBP
    if (
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
    ) {
        return "image/webp";
    }

    return null;
}
