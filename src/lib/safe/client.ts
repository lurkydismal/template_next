import "server-only";
import { createSafeActionClient } from "next-safe-action";

import { userMessages } from "@/utils/messages";
import log from "@/utils/stdlog";

/**
 * Base server-action client.
 * Unexpected exceptions are logged with their details on the server while only
 * a safe, consistent message is returned to the browser.
 */
export const actionClient = createSafeActionClient({
    handleServerError(error) {
        log.error("Unhandled server action error", error);
        return userMessages.errors.unexpected;
    },
});
