import type { Pool } from "pg";

export type ReadinessResult = { ok: true } | { ok: false; reason: "database" | "schema" };

const READINESS_TIMEOUT_MS = 3_000;

/** Objects a correctly migrated database must contain. */
const SCHEMA_PROBE = `
    SELECT
        to_regclass('public."user"') IS NOT NULL AS has_user,
        to_regclass('public.tables') IS NOT NULL AS has_tables,
        EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'tables_record_field_changes' AND NOT tgisinternal
        ) AS has_audit_trigger
`;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Checks that PostgreSQL answers and that migrations (including the audit trigger) were
 * applied. Returns a coarse reason only; callers must not expose driver errors.
 */
export async function checkReadiness(
    pool: Pick<Pool, "query">,
    timeoutMs = READINESS_TIMEOUT_MS,
): Promise<ReadinessResult> {
    let row: { has_user: boolean; has_tables: boolean; has_audit_trigger: boolean } | undefined;

    try {
        const result = await withTimeout(pool.query(SCHEMA_PROBE), timeoutMs);
        row = result.rows[0];
    } catch {
        return { ok: false, reason: "database" };
    }

    if (!row?.has_user || !row.has_tables || !row.has_audit_trigger) {
        return { ok: false, reason: "schema" };
    }

    return { ok: true };
}
