import { isBrowser } from "@/utils/stdvar";
import { browserLogger } from "./browser";
import { CommonLogger } from "./types";
import { serverLogger } from "./server";

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
