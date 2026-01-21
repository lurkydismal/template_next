/**
 * Flag indicating whether detailed trace logging should be enabled.
 * - `true` forces verbose logging regardless of environment.
 * - `false` disables trace-level logging unless explicitly set elsewhere.
 */
export const needTrace = true;

/**
 * Flag indicating if the current environment is development.
 * - Determined by the `NODE_ENV` environment variable.
 * - `true` if `process.env.NODE_ENV === "development"`.
 */
export const isDev = process.env.NODE_ENV === "development";

/**
 * Flag indicating if the current environment is production.
 * - True when `process.env.NODE_ENV === "production"`.
 * - Useful for conditional logic that should only run in production.
 */
export const isProd = process.env.NODE_ENV === "production";

/**
 * Flag indicating if the current environment is a test environment.
 * - True when `process.env.NODE_ENV === "test"`.
 * - Useful for skipping certain behaviors or using mock data in tests.
 */
export const isTest = process.env.NODE_ENV === "test";

/**
 * Flag indicating if the code is running in a browser environment.
 * - `true` if `window` is defined.
 * - Useful for distinguishing server vs client code execution.
 */
export const isBrowser = typeof window !== "undefined";

/**
 * Flag indicating if the code is running on the server.
 * - True when `window` is undefined (e.g., Node.js or SSR).
 * - Useful for distinguishing server vs client execution.
 */
export const isServer = typeof window === "undefined";

/**
 * Base URL for API calls.
 * - Reads from the environment variable `NEXT_PUBLIC_API_URL`.
 * - Defaults to `"/api"` if not set.
 * - Useful for constructing HTTP requests to the backend.
 */
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/**
 * Name of the application.
 * - Used in logging, UI, or headers.
 */
export const appName = "template_next";

/**
 * Version of the application.
 * - Useful for logging, cache busting, or displaying in UI.
 */
export const appVersion = "0.1.0";

/**
 * Base path for the application.
 * - Mirrors `basePath` from Next.js config.
 * - Fetched from environment variable `NEXT_PUBLIC_BASE_PATH`.
 * - Defaults to empty string if not set.
 */
export const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Asset prefix for static assets.
 * - Mirrors `assetPrefix` from Next.js config.
 * - Fetched from environment variable `NEXT_PUBLIC_ASSET_PREFIX`.
 * - Defaults to empty string if not set.
 */
export const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "";

/**
 * Default date/time format used throughout the application.
 * - Format string: `"DD.MM.YYYY"`
 * - Example: `"07.01.2026"`
 */
export const dateFormat = "DD.MM.YYYY";

/**
 * Default timezone used for date/time operations.
 * - Example: `"UTC"`.
 */
export const timeZone = "UTC";

/**
 * Default full date/time format including seconds.
 * - Format string: `"HH:mm DD.MM.YYYY"`.
 * - Example: `"14:30 2026-01-07"`.
 */
export const dateTimeFormat = "HH:mm DD.MM.YYYY";

/**
 * Type representing standard color labels used in UI or logging.
 * - Can be used for styling messages, badges, or components.
 */
export type Color =
    | "default"
    | "error"
    | "info"
    | "primary"
    | "secondary"
    | "success"
    | "warning";

/**
 * Maximum allowed image size for uploads.
 * - Set to 1 megabyte (1 MB) = 1 * 1024 * 1024 bytes.
 * - Used in file validation to prevent oversized uploads.
 */
export const maxImageSize = 1 * 1024 * 1024; // 1 MB

/**
 * Allowed MIME types for image uploads.
 * - Currently only supports JPEG images.
 * - Used in validation to reject unsupported formats.
 */
export const allowedImageTypes = ["image/jpeg"];

/**
 * Maximum number of retry attempts for network requests or operations.
 */
export const maxRetries = 3;

/**
 * Keys used for localStorage or sessionStorage.
 * - Example: storing auth tokens, theme preferences, etc.
 */
export const storageKeys = { authToken: "authToken" };
