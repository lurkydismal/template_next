import { Logger } from "tslog";
import { isBrowser, isDev, needTrace } from "@/utils/stdvar";
import { browserLogger } from "./browser";
import { CommonLogger } from "./types";

/**
 * Determine minimum server log level:
 * - `needTrace` forces the most verbose level (1).
 * - In development (`isDev` true) use level 2.
 * - Otherwise use level 3 for production.
 *
 * These numeric levels are passed to `tslog` as `minLevel`.
 */
const logLevel = needTrace ? 1 : isDev ? 2 : 3;

/**
 * `serverLogger` - `tslog`-based logger configured for server/node environments.
 * - `type: "pretty"` renders human-readable logs.
 * - `minLevel` is set based on environment and tracing flags.
 * - `prettyLogTemplate` is configured to show the log level name followed by a tab.
 */
// TODO: Move to separate server file
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

/**
 * Logs the properties of an object along with their types.
 *
 * Each key-value pair of the input object is logged using `log.trace`.
 * The output format is: `<key>: <value> (type: <type of value>)`.
 *
 * @template T - The type of object to log. Can be an arbitrary object with string keys.
 * @param {T} obj - The object whose properties will be logged.
 */
export function logVar<T extends Record<string, unknown>>(obj: T) {
    for (const [key, value] of Object.entries(obj)) {
        log.trace(`${key}:`, value, `(type: ${typeof value})`);
    }
}
