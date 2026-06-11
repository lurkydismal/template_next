import { Logger } from "tslog";
import { isDev, needTrace } from "@/utils/stdvar";

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
export const serverLogger = new Logger({
    type: "pretty",
    minLevel: logLevel,
    prettyLogTemplate: "{{dateIsoStr}} {{logLevelName}}\t",
});
