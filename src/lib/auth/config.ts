import { type EnvSource, isProduction, readBoolEnv, readEnv, readListEnv } from "@/lib/env";

/** Minimum length Better Auth requires for its signing secret. */
export const MIN_AUTH_SECRET_LENGTH = 32;

export type AuthRuntimeConfig = {
    secret: string | undefined;
    baseURL: string | undefined;
    trustedOrigins: string[];
    /** True when new accounts cannot be created through the application. */
    signUpDisabled: boolean;
    useSecureCookies: boolean;
    /** Better Auth's built-in rate limiter. Only disable for automated tests. */
    rateLimitEnabled: boolean;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLocalOrigin(origin: string | undefined): boolean {
    try {
        return origin !== undefined && LOCAL_HOSTS.has(new URL(origin).hostname);
    } catch {
        return false;
    }
}

/**
 * Resolves authentication settings from the environment.
 *
 * - `AUTH_DISABLE_SIGN_UP` defaults to `true` in production and `false` elsewhere, because
 *   every signed-in account currently receives the same dashboard access.
 * - Production refuses to start with a missing or short secret or a non-https URL
 *   (localhost excepted).
 */
export function resolveAuthConfig(env: EnvSource = process.env): AuthRuntimeConfig {
    const production = isProduction(env);
    const secret = readEnv("BETTER_AUTH_SECRET", env);
    const baseURL = env.BETTER_AUTH_URL?.trim() || undefined;

    if (production) {
        if (!secret || secret.length < MIN_AUTH_SECRET_LENGTH) {
            throw new Error(
                `BETTER_AUTH_SECRET must be set and contain at least ${MIN_AUTH_SECRET_LENGTH} characters in production`,
            );
        }
        // Plain http is tolerated only for localhost so `next start` can be tried locally.
        if (!baseURL?.startsWith("https://") && !isLocalOrigin(baseURL)) {
            throw new Error("BETTER_AUTH_URL must be an https:// origin in production");
        }
    }

    const trustedOrigins = readListEnv("BETTER_AUTH_TRUSTED_ORIGINS", env);
    if (baseURL && !trustedOrigins.includes(baseURL)) trustedOrigins.push(baseURL);

    return {
        secret,
        baseURL,
        trustedOrigins,
        signUpDisabled: readBoolEnv("AUTH_DISABLE_SIGN_UP", production, env),
        useSecureCookies: production && (baseURL?.startsWith("https://") ?? false),
        rateLimitEnabled: readBoolEnv("AUTH_RATE_LIMIT", production, env),
    };
}

export const authConfig = resolveAuthConfig();
