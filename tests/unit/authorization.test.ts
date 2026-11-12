import { describe, expect, it } from "vitest";

import { requireAuthenticatedUser, UnauthorizedError } from "@/lib/auth/authorization";

describe("requireAuthenticatedUser", () => {
    it("returns the user from a valid session", () => {
        const user = { id: "user-123", name: "Test User" };
        expect(requireAuthenticatedUser({ user, session: { id: "session-1" } })).toBe(user);
    });

    it.each([
        null,
        undefined,
        {},
        { user: null },
        { user: {} },
        { user: { id: "" } },
        { user: { id: "   " } },
    ])("rejects a missing or malformed session (%j)", (session) => {
        expect(() => requireAuthenticatedUser(session as never)).toThrow(UnauthorizedError);
    });
});
