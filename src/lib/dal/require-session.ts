import "server-only";
import { requireAuthenticatedUser, UnauthorizedError } from "@/lib/auth/authorization";
import { getCurrentSession, getRequestSession } from "@/lib/auth/session";

export { UnauthorizedError };

export type SessionData = NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>;

/**
 * Server Actions / Server Components: returns the session or throws
 * {@link UnauthorizedError} ("Authentication is required") for a missing or malformed one.
 */
export async function requireSession(): Promise<SessionData> {
    const session = await getCurrentSession();
    requireAuthenticatedUser(session);
    return session as SessionData;
}

/** 401 response for route handlers. Carries no detail about why authentication failed. */
function unauthenticatedResponse(): Response {
    return Response.json(
        { error: new UnauthorizedError().message },
        { status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Session" } },
    );
}

/**
 * Route-handler guard. Reads the session from the request itself (no dependence on Next's
 * request scope) and returns a 401 `Response` when there is none, otherwise the session.
 *
 *     const guard = await guardRoute(request);
 *     if (guard instanceof Response) return guard;
 */
export async function guardRoute(request: Request): Promise<SessionData | Response> {
    const session = await getRequestSession(request);

    try {
        requireAuthenticatedUser(session);
    } catch {
        // requireAuthenticatedUser only throws UnauthorizedError.
        return unauthenticatedResponse();
    }

    return session as SessionData;
}
