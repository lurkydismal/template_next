"use server";

/**
 * auth.ts
 *
 * Server-side authentication helpers for a Next.js app.
 * - Hashes and verifies passwords with argon2.
 * - Issues and verifies JWTs (jsonwebtoken).
 * - Writes/clears HttpOnly auth cookies using Next's cookies() API.
 *
 * Notes / responsibilities:
 * - This file runs on the Node server (not Edge runtime).
 * - Keep secrets (jwtSecret) only in env; never return them.
 * - HttpOnly cookie is the authority for auth — client JS cannot read it.
 * - JWT payloads will include `iat`/`exp` fields added by jsonwebtoken.
 *   If you validate the payload with a strict Zod schema, account for those extra fields.
 *
 * Security reminders:
 * - Use short-lived access tokens (or implement refresh tokens) for long sessions.
 * - Avoid storing sensitive user data in JWTs; prefer minimal claims (id, username, role).
 * - `SameSite: "strict"` blocks some cross-site flows — confirm it matches your needs.
 *
 * Added protections in this file:
 * - Normalizes usernames (trim + lowercase) to avoid duplicates / casing issues.
 * - Basic in-process rate limiting per username for login attempts (best-effort; not suitable
 *   as the sole protection in a distributed environment — use Redis or another central store
 *   for production).
 * - try/catch with explicit logging in register and login for auditing (does not log secrets).
 */

import type { StringValue } from "ms";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import db from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { UsersRowPublic } from "@/db/types";
import { getEnv, normalizeArrayOrValue } from "@/utils/stdfunc";
import { userSelectPublicSchema } from "@/utils/validate/schemas";
import z from "zod";
import ms from "ms";
import { storageKeys } from "@/utils/stdvar";
import log from "@/utils/stdlog";

/*
 * Environment-configured values.
 *
 * jwtExpiresIn is narrowed to `StringValue` (ms-style string) so TypeScript
 * accepts it in jsonwebtoken's `expiresIn` option. Validate this env at app start
 * if you want stronger guarantees.
 */
const jwtSecret = getEnv("JWT_SECRET");
const jwtExpiresIn = getEnv("JWT_EXPIRES_IN") as StringValue; // e.g. "15m" or "7d"
const cookieSecure = getEnv("COOKIE_SECURE") === "true";

/**
 * In-process login attempt tracker (best-effort).
 * - Keyed by normalized username.
 * - Resets after WINDOW_MS.
 *
 * NOTE: This is stored in-memory and will not work across multiple server instances
 * or function cold starts. For robust protection use a centralized store (Redis).
 */
const LOGIN_ATTEMPTS = new Map<
    string,
    { count: number; firstAttemptTs: number }
>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function recordFailedLoginAttempt(normalizedUsername: string) {
    const now = Date.now();
    const record = LOGIN_ATTEMPTS.get(normalizedUsername);
    if (!record) {
        LOGIN_ATTEMPTS.set(normalizedUsername, {
            count: 1,
            firstAttemptTs: now,
        });
        return;
    }
    // if window expired, reset
    if (now - record.firstAttemptTs > LOGIN_WINDOW_MS) {
        LOGIN_ATTEMPTS.set(normalizedUsername, {
            count: 1,
            firstAttemptTs: now,
        });
        return;
    }
    record.count += 1;
    // update map (object is mutated but re-set to be explicit)
    LOGIN_ATTEMPTS.set(normalizedUsername, record);
}

function isLoginBlocked(normalizedUsername: string) {
    const now = Date.now();
    const record = LOGIN_ATTEMPTS.get(normalizedUsername);
    if (!record) return false;
    if (now - record.firstAttemptTs > LOGIN_WINDOW_MS) {
        // expired window -> reset
        LOGIN_ATTEMPTS.delete(normalizedUsername);
        return false;
    }
    return record.count >= MAX_LOGIN_ATTEMPTS;
}

function resetLoginAttempts(normalizedUsername: string) {
    LOGIN_ATTEMPTS.delete(normalizedUsername);
}

/**
 * Small wrapper for argon2.hash.
 * - Returns a Promise<string> containing the password hash.
 * - Keep the argon2 options centralized if you later need to tweak memory/cost.
 */
async function hashPassword(password: string) {
    return await argon2.hash(password);
}

/**
 * Sign a JWT with the provided payload.
 * - Payload here is a minimal partial of UsersRowPublic or an object containing username.
 * - jsonwebtoken will append `iat` and (because of expiresIn) `exp`.
 * - Keep the payload small to avoid large cookies and to reduce attack surface.
 *
 * NOTE: ms() returns milliseconds; cookie maxAge expects seconds.
 */
function signJwt(
    payload: Partial<UsersRowPublic> | { username: string },
    remember: boolean,
) {
    const expiresIn = Math.floor(ms(remember ? "100d" : jwtExpiresIn) / 1000);

    return jwt.sign(payload, jwtSecret, {
        algorithm: "HS256",
        expiresIn,
    });
}

/**
 * Verify a token and return the decoded JwtPayload or null on failure.
 * - Uses jsonwebtoken.verify which checks signature and expiration.
 * - Returns `null` for any verification/validation error.
 *
 * The function validates only the expected public fields (username, avatar_url)
 * using your existing userSelectPublicSchema to avoid iat/exp causing downstream failures.
 */
async function verifyJwt(token: string): Promise<null | UsersRowPublic> {
    try {
        // verify signature + expiry and restrict algorithm to HS256
        const verified = jwt.verify(token, jwtSecret, {
            algorithms: ["HS256"],
        });

        // jwt.verify may return a string (if token payload was a string); treat that as invalid
        if (typeof verified === "string") return null;

        // normalized payload as a plain object
        const payload = verified as Record<string, unknown>;

        // pick and validate only the public fields you expect inside the token.
        // this prevents `iat/exp` or other JWT metadata from breaking your schema.
        const publicSchema = userSelectPublicSchema.pick({
            username: true,
            username_normalized: true,
            avatar_url: true,
        });

        // build a minimal object and validate it with Zod
        const parsed = publicSchema.parse({
            username: payload.username,
            username_normalized: payload.username_normalized,
            // keep explicit null handling for avatar_url
            avatar_url: payload.avatar_url ?? null,
        });

        // parsed is now a UsersRowPublic-like object (only the fields from publicSchema)
        return parsed as UsersRowPublic;
    } catch {
        // any verification / validation error => null (treat token as invalid)
        return null;
    }
}

/**
 * CookieStore type alias derived from Next's cookies() return type.
 * - Avoids importing internal Next types directly.
 * - The CookieStore is request-scoped and must not be cached across requests.
 */
type CookieStore = Awaited<ReturnType<typeof cookies>>;

/**
 * Write an HttpOnly cookie that stores the access token.
 * - `remember` controls cookie lifetime (longer maxAge when true).
 * - maxAge is computed using `ms()`. `jwtExpiresIn` must be a parsable ms string.
 * - Cookie attributes:
 *   - httpOnly: true (not accessible to client JS)
 *   - secure: controlled by COOKIE_SECURE (true in prod over HTTPS)
 *   - sameSite: "strict" (strong CSRF prevention; adjust if you need cross-site flows)
 *   - path: "/" so it applies across the app
 *
 * Important: cookieStore.set() is synchronous for the API surface here, but the cookie
 * takes effect in the response for the current request.
 *
 * NOTE: ms() returns milliseconds; cookie maxAge expects seconds.
 */
async function cookieForToken(
    cookieStore: CookieStore,
    token: string,
    remember: boolean,
) {
    const maxAge = Math.floor(ms(remember ? "100d" : jwtExpiresIn) / 1000);

    cookieStore.set({
        name: storageKeys.server!.accessToken,
        value: token,
        httpOnly: true,
        secure: cookieSecure,
        sameSite: "lax",
        path: "/",
        maxAge,
    });
}

/**
 * Clear the auth cookie by setting an expired cookie value.
 * - Setting `expires: new Date(0)` causes the browser to remove the cookie.
 */
export async function clearAuthCookie(cookieStore: CookieStore) {
    return cookieStore.delete({
        name: storageKeys.server!.accessToken,
        httpOnly: true,
        secure: cookieSecure,
        sameSite: "lax",
        path: "/",
    });
}

/**
 * register
 * - Validates incoming user data using Zod schema (userSelectPublicSchema extended with password).
 * - Hashes the password with Argon2.
 * - Inserts the user into the DB via drizzle-orm and returns the public user record.
 * - Issues a JWT and sets it in an HttpOnly cookie so the client is authenticated after registration.
 *
 * Notes / caveats:
 * - You already planned to add validation and additional DB checks (unique username, etc).
 * - DB `returning()` behavior can vary depending on dialect/driver; `created` normalization handles array vs single-result.
 * - The JWT contains the public fields you selected — keep that minimal to avoid stale data and large token size.
 *
 * This implementation normalizes username and logs errors (without secrets) for auditing.
 */
export async function register(user: {
    username: string;
    password: string;
    avatar_url: string | null;
}) {
    // parse + validate input; throws on invalid input
    const parsed = userSelectPublicSchema
        .omit({
            username_normalized: true,
        })
        .extend({
            password: z.string().trim().min(1),
        })
        .parse(user);

    // normalize username (trim + lowercase) to avoid duplicates/casing issues
    const normalizedUsername = parsed.username.trim().toLowerCase();

    try {
        const hash = await hashPassword(parsed.password);

        const inserted = await db
            .insert(users)
            .values({
                username: parsed.username.trim(),
                username_normalized: normalizedUsername,
                password_hash: hash,
                avatar_url: parsed.avatar_url ?? null,
            })
            .returning({
                username: users.username,
                username_normalized: users.username_normalized,
                avatar_url: users.avatar_url,
            })
            .execute();

        // Normalize
        const created = normalizeArrayOrValue(inserted);

        // Create minimal payload for token
        const payload = {
            username: created.username,
            username_normalized: created.username_normalized,
            avatar_url: parsed.avatar_url ?? null,
        };

        const token = signJwt(payload, false);

        const cookieStore = await cookies();
        cookieForToken(cookieStore, token, false);

        // Return safe public user object (for immediate response)
        const publicUser: UsersRowPublic = {
            username: created.username,
            username_normalized: created.username_normalized,
            avatar_url: created.avatar_url ?? null,
        };

        return publicUser;
    } catch (err) {
        // Audit log: capture username and the error message, but do NOT log sensitive data.
        log.error("register failed", {
            username: normalizedUsername,
            error: err instanceof Error ? err.message : String(err),
        });
        // Re-throw to let caller handle the error (keep message generic at higher level)
        throw err;
    }
}

/**
 * verifyPassword
 * - Validates the input shape (username + password) using Zod derived from userSelectPublicSchema.
 * - Selects the stored password hash from the DB and verifies it with argon2.verify.
 * - Returns boolean success/failure.
 *
 * Note: timing and error messages are intentionally generic to avoid leaking info.
 */
async function verifyPassword(user: { username: string; password: string }) {
    const parsed = userSelectPublicSchema
        .omit({
            username_normalized: true,
            avatar_url: true,
        })
        .extend({
            password: z.string().trim().min(1),
        })
        .parse(user);

    const selected = await db
        .select({ hash: users.password_hash })
        .from(users)
        .where(eq(users.username_normalized, parsed.username))
        .limit(1)
        .execute();

    // If no user found, return false early
    const row = normalizeArrayOrValue(selected);
    if (!row || !row.hash) return false;

    try {
        return await argon2.verify(row.hash, parsed.password);
    } catch {
        return false;
    }
}

/**
 * login
 * - Validates credentials, verifies password, fetches public user data, issues token, sets cookie, returns public user.
 * - `remember` extends cookie lifetime.
 *
 * Behavior details:
 * - Throws "Invalid credentials" for both not-found and bad-password cases to avoid user enumeration.
 * - Applies a basic in-process rate limit per normalized username.
 * - Returns UsersRowPublic so callers (client code) can update UI immediately without a second request.
 *
 * Potential improvements:
 * - Replace in-memory rate limiter with Redis or other central store for production.
 * - Rate-limit by IP as well as by username.
 */
export async function login(credentials: {
    username: string;
    password: string;
    remember?: boolean;
}): Promise<UsersRowPublic> {
    // parse -> validate (this will throw on invalid shape)
    const parsed = userSelectPublicSchema
        .omit({ username_normalized: true, avatar_url: true }) // only need username for auth
        .extend({
            password: z.string().trim().min(1),
            remember: z.boolean().optional(),
        })
        .parse(credentials);

    // normalize username (trim + lowercase)
    const normalizedUsername = parsed.username.trim().toLowerCase();

    // Rate-limit check (best-effort)
    if (isLoginBlocked(normalizedUsername)) {
        // Log the blocked attempt for auditing
        log.warn("login blocked due to too many attempts", {
            username: normalizedUsername,
        });
        throw new Error("Too many login attempts. Try again later.");
    }

    try {
        // verify password (pass normalized username)
        const ok = await verifyPassword({
            username: normalizedUsername,
            password: parsed.password,
        });

        if (!ok) {
            // record failed attempt and return generic error
            recordFailedLoginAttempt(normalizedUsername);
            throw new Error("Invalid credentials");
        }

        // fetch public user from DB
        const selected = await db
            .select({
                username: users.username,
                username_normalized: users.username_normalized,
                avatar_url: users.avatar_url,
            })
            .from(users)
            .where(eq(users.username_normalized, normalizedUsername))
            .limit(1)
            .execute();

        const found = normalizeArrayOrValue(selected);
        if (!found || !found.username) {
            // Should be impossible if verifyPassword returned true, but guard anyway
            recordFailedLoginAttempt(normalizedUsername);
            throw new Error("Invalid credentials");
        }

        // prepare payload and token
        const payload = {
            username: found.username,
            username_normalized: found.username_normalized,
            avatar_url: found.avatar_url ?? null,
        };

        const token = signJwt(payload, Boolean(parsed.remember));

        // set cookie
        const cookieStore = await cookies();
        await cookieForToken(cookieStore, token, Boolean(parsed.remember));

        // reset attempts after successful login
        resetLoginAttempts(normalizedUsername);

        // return safe public user
        const publicUser: UsersRowPublic = {
            username: found.username,
            username_normalized: found.username_normalized,
            avatar_url: found.avatar_url ?? null,
        };

        return publicUser;
    } catch (err) {
        // Audit log: capture username and a safe error description (no secrets)
        log.error("login failed", {
            username: normalizedUsername,
            error: err instanceof Error ? err.message : String(err),
        });
        // Re-throw so upstream can map to proper HTTP response codes
        throw err;
    }
}

/**
 * getSessionData
 * - Reads the auth cookie from the request, verifies the JWT, and returns the parsed public user object.
 *
 * Caveats:
 * - The code currently `throw`s when there's no token. Consider returning `null` instead to make the API
 *   easier to consume when no session exists.
 * - jwt.verify attaches `iat`/`exp` to the payload. If `userSelectPublicSchema` is strict, parsing will fail.
 *   Use `.passthrough()` or explicitly pick the fields you expect from the verified payload.
 * - This function returns only what is present in the token; for authoritative profile data, query the DB
 *   (token can be stale).
 */
export async function getSessionData(): Promise<null | UsersRowPublic> {
    const cookieStore = await cookies();
    const token = cookieStore.get(storageKeys.server!.accessToken)?.value;
    if (!token) return null;

    const payload = await verifyJwt(token);
    if (!payload || typeof payload === "string") return null;

    const parsed: UsersRowPublic = userSelectPublicSchema.parse(payload);

    return parsed;
}
