import { connection } from "next/server";

/** Liveness: the process is running. Deliberately does not touch PostgreSQL. */
export async function GET(): Promise<Response> {
    await connection(); // never prerender at build time
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
