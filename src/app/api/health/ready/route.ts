import { sql } from "drizzle-orm";

import db from "@/db";
import log from "@/utils/stdlog";

/** Readiness probe. Returns 503 while the application cannot reach PostgreSQL. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Query a table created by the initial schema migration, not only the
        // connection itself. This keeps a fresh-but-unmigrated database unready.
        await db.execute(sql`select 1 from "user" limit 0`);

        return Response.json(
            { status: "ok", dependencies: { database: "ok" } },
            { headers: { "Cache-Control": "no-store, max-age=0" } },
        );
    } catch (error) {
        log.error("Application readiness check failed", error);

        return Response.json(
            { status: "unavailable" },
            {
                status: 503,
                headers: { "Cache-Control": "no-store, max-age=0" },
            },
        );
    }
}
