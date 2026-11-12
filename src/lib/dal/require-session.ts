import "server-only";
import { headers } from "next/headers";

import auth from "@/lib/auth";
import { userMessages } from "@/utils/messages";

export type SessionData = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/** Thrown by server actions/data readers when no valid session exists. */
export class UnauthenticatedError extends Error {
    constructor() {
        super("Unauthenticated");
        this.name = "UnauthenticatedError";
    }
}

/** Returns the current session or `null`. Safe for route handlers and server actions. */
export async function getOptionalSession(): Promise<SessionData | null> {
    return auth.api.getSession({ headers: await headers() });
}

/** Returns the current session or throws {@link UnauthenticatedError}. */
export async function requireSession(): Promise<SessionData> {
    const session = await getOptionalSession();
    if (!session) throw new UnauthenticatedError();
    return session;
}

/** 401 response for route handlers. Carries no detail about why authentication failed. */
export function unauthenticatedResponse(): Response {
    return Response.json(
        { error: userMessages.errors.unauthenticated },
        { status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Session" } },
    );
}

/**
 * Route-handler guard. Returns a 401 `Response` when unauthenticated, otherwise the session.
 *
 *     const guard = await guardRoute();
 *     if (guard instanceof Response) return guard;
 */
export async function guardRoute(): Promise<SessionData | Response> {
    const session = await getOptionalSession();
    return session ?? unauthenticatedResponse();
}
