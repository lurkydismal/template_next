import { readFileSync } from "node:fs";

/** Any string map; `process.env` and plain test objects both qualify. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * Server-only environment helpers.
 *
 * Every secret-like value can be supplied either directly (`NAME=value`) or as a
 * file path (`NAME_FILE=/run/secrets/name`), which is how the production Compose
 * stack mounts credentials. A direct value wins when both are set.
 */

/** Reads an optional variable, resolving the `_FILE` variant. Returns `undefined` when unset. */
export function readEnv(name: string, env: EnvSource = process.env): string | undefined {
    const direct = env[name];
    if (direct !== undefined && direct !== "") return direct;

    const filePath = env[`${name}_FILE`];
    if (!filePath) return undefined;

    let contents: string;
    try {
        contents = readFileSync(filePath, "utf8");
    } catch {
        // Never echo the path contents or the underlying error; both can hint at secret layout.
        throw new Error(`Unable to read the file configured by ${name}_FILE`);
    }

    const value = contents.replace(/\r?\n$/, "");
    if (value.length === 0) throw new Error(`The file configured by ${name}_FILE is empty`);
    return value;
}

/** Reads a required variable (directly or via `_FILE`). */
export function requireEnv(name: string, env: EnvSource = process.env): string {
    const value = readEnv(name, env);
    if (value === undefined) throw new Error(`Missing required environment variable: ${name}`);
    return value;
}

/** Reads a bounded integer variable with a default. Invalid values fail fast at startup. */
export function readIntEnv(
    name: string,
    fallback: number,
    { min = 0, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {},
    env: EnvSource = process.env,
): number {
    const raw = env[name];
    if (raw === undefined || raw === "") return fallback;

    if (!/^\d+$/.test(raw.trim())) throw new Error(`${name} must be a non-negative integer`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
        throw new Error(`${name} must be an integer between ${min} and ${max}`);
    }
    return value;
}

/** Reads a strict boolean (`true`/`false`) variable with a default. */
export function readBoolEnv(
    name: string,
    fallback: boolean,
    env: EnvSource = process.env,
): boolean {
    const raw = env[name]?.trim();
    if (raw === undefined || raw === "") return fallback;
    if (raw === "true") return true;
    if (raw === "false") return false;
    throw new Error(`${name} must be "true" or "false"`);
}

/** Splits a comma-separated list, dropping blanks and duplicates. */
export function readListEnv(name: string, env: EnvSource = process.env): string[] {
    const raw = env[name];
    if (!raw) return [];
    return [
        ...new Set(
            raw
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
        ),
    ];
}

export const isProduction = (env: EnvSource = process.env) => env.NODE_ENV === "production";

export type DbSslMode = "disable" | "require" | "verify-full";

/**
 * `DB_SSL` controls TLS to PostgreSQL. The bundled Compose stack talks to PostgreSQL over a
 * private internal network without TLS, so the default is `disable`. Use `verify-full` (or
 * `require` when the certificate chain cannot be verified) for managed databases.
 */
export function readDbSsl(env: EnvSource = process.env): DbSslMode {
    const raw = env.DB_SSL?.trim() || "disable";
    if (raw === "disable" || raw === "require" || raw === "verify-full") return raw;
    throw new Error('DB_SSL must be "disable", "require" or "verify-full"');
}

/** Maps {@link DbSslMode} to node-postgres' `ssl` option. */
export function dbSslOption(mode: DbSslMode): false | { rejectUnauthorized: boolean } {
    if (mode === "disable") return false;
    return { rejectUnauthorized: mode === "verify-full" };
}
