import { Logger } from "tslog";
import { isBrowser, isDev, needTrace } from "@/utils/stdvar";

/**
 * Determine minimum server log level:
 * - `needTrace` forces the most verbose level (1).
 * - In development (`isDev` true) use level 2.
 * - Otherwise use level 3 for production.
 *
 * These numeric levels are passed to `tslog` as `minLevel`.
 */
const logLevel = needTrace ? 1 : isDev ? 2 : 3;

type LogFn = (...args: unknown[]) => void;

/**
 * Common logger shape used by both browser and server implementations.
 * Each property is a logging function that accepts any arguments.
 */
type CommonLogger = {
    trace: LogFn;
    debug: LogFn;
    info: LogFn;
    warn: LogFn;
    error: LogFn;
    fatal: LogFn;
};

/**
 * Create a browser-friendly logger that:
 * - Uses CSS styles for log level labels.
 * - Chooses the best available console method (debug/info/warn/error).
 * - Formats log lines to include a colored level label and the provided arguments.
 *
 * Important behavior details:
 * - If a single object is passed, the call prints `label, style, object` so inspectability
 *   in devtools is preserved.
 * - If the first argument is a string (or multiple args), it prints `label, style, ...args`.
 */
function makeBrowserLogger(): CommonLogger {
    const styles: Record<string, string> = {
        TRACE: "color:#888",
        DEBUG: "color:lime",
        INFO: "color:#64b5f6",
        WARN: "color:darkorange;font-weight:700",
        ERROR: "color:#ef9a9a",
        FATAL: "background:crimson;color:white;font-weight:700;padding:2px 4px;border-radius:2px",
    };

    /**
     * Map a log level to the appropriate console method.
     * Falls back to console.log when a specific method is not available.
     */
    const getConsoleMethod = (level: string) => {
        switch (level) {
            case "TRACE":
            case "DEBUG":
                return console.debug ?? console.log;
            case "INFO":
                return console.info ?? console.log;
            case "WARN":
                return console.warn ?? console.log;
            case "ERROR":
            case "FATAL":
            default:
                return console.error ?? console.log;
        }
    };

    /**
     * Create a level-specific logging function that:
     * - Prepends a styled level label (`%cLEVEL`) so the label is colored.
     * - Preserves object inspectability in devtools by treating single-object calls specially.
     */
    const makeLevel = (level: string): LogFn => {
        const method = getConsoleMethod(level);
        const label = `%c${level}`;
        const style = styles[level] ?? "";

        return (...args: unknown[]) => {
            // If first arg is a string, include it in the formatted line; otherwise show label + object(s)
            if (args.length === 1 && typeof args[0] === "object") {
                method.call(console, label, style, args[0]);
                return;
            }
            // If first arg is a string, show label and the rest of args inline
            method.call(console, label, style, ...args);
        };
    };

    return {
        trace: makeLevel("TRACE"),
        debug: makeLevel("DEBUG"),
        info: makeLevel("INFO"),
        warn: makeLevel("WARN"),
        error: makeLevel("ERROR"),
        fatal: makeLevel("FATAL"),
    };
}

/**
 * `browserLogger` - a lightweight, styled console logger for use in browser environments.
 */
export const browserLogger = makeBrowserLogger();

/**
 * `serverLogger` - `tslog`-based logger configured for server/node environments.
 * - `type: "pretty"` renders human-readable logs.
 * - `minLevel` is set based on environment and tracing flags.
 * - `prettyLogTemplate` is configured to show the log level name followed by a tab.
 */
export const serverLogger = new Logger({
    type: "pretty",
    minLevel: logLevel,
    prettyLogTemplate: "{{dateIsoStr}} {{logLevelName}}\t",
});

/**
 * `log` selects the appropriate logger implementation at runtime:
 * - `browserLogger` when running in a browser environment.
 * - `serverLogger` when running on server/node.
 *
 * It is typed as `CommonLogger` so consumers can call `.trace/.debug/.info/.warn/.error/.fatal`
 * uniformly without knowing the underlying implementation.
 */
const log: CommonLogger = isBrowser
    ? browserLogger
    : (serverLogger as unknown as CommonLogger);

export default log;

// TODO: Document
export function logVar<T extends Record<string, any>>(obj: T) {
    for (const [key, value] of Object.entries(obj)) {
        log.trace(`${key}:`, value, `(type: ${typeof value})`);
    }
}
