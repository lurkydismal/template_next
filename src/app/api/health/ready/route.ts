import { connection } from "next/server";

import { pool } from "@/db";
import { checkReadiness } from "@/lib/health";
import log from "@/utils/stdlog";

/**
 * Readiness: PostgreSQL is reachable and the schema is migrated.
 * Responds 503 without any connection detail when not ready.
 */
export async function GET(): Promise<Response> {
    await connection(); // never prerender at build time

    const result = await checkReadiness(pool);
    const headers = { "Cache-Control": "no-store" };

    if (result.ok) return Response.json({ status: "ok" }, { headers });

    log.warn("Readiness check failed", { reason: result.reason });
    return Response.json({ status: "unavailable" }, { status: 503, headers });
}
