/** Raised when a server-only operation is attempted without an authenticated user. */
export class UnauthorizedError extends Error {
    constructor(message = "Authentication is required") {
        super(message);
        this.name = "UnauthorizedError";
    }
}

/** Returns the user or fails closed when the session is absent or malformed. */
export function requireAuthenticatedUser<T extends { user: { id: string } }>(
    session: T | null | undefined,
): T["user"] {
    const user = session?.user;
    if (!user || typeof user.id !== "string" || user.id.trim().length === 0) {
        throw new UnauthorizedError();
    }
    return user;
}
