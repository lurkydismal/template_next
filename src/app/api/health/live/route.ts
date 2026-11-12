/** Process liveness probe. This endpoint deliberately does not depend on PostgreSQL. */
export function GET() {
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
