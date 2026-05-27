/**
 * Determines whether a URL/path points to an image based on common extension patterns.
 */
export function isImagePath(value: string): boolean {
    return /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?$/i.test(value);
}

/**
 * Converts configured accept filters into a valid <input type="file"> accept string.
 */
export function toAcceptString(accept?: string | string[]): string | undefined {
    if (!accept) return undefined;
    return Array.isArray(accept) ? accept.join(",") : accept;
}
