import { isBrowser } from "@/utils/stdvar";

import { browserLogger } from "./browser";
import { serverLogger } from "./server";
import { CommonLogger } from "./types";

/**
 * `log` selects the appropriate logger implementation at runtime:
 * - `browserLogger` when running in a browser environment.
 * - `serverLogger` when running on server/node.
 *
 * It is typed as `CommonLogger` so consumers can call `.trace/.debug/.info/.warn/.error/.fatal`
 * uniformly without knowing the underlying implementation.
 */
const log: CommonLogger = isBrowser ? browserLogger : (serverLogger as unknown as CommonLogger);

export default log;
