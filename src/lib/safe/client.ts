import "server-only";
import { createSafeActionClient } from "next-safe-action";

// Public action client (no auth required)
export const actionClient = createSafeActionClient();