/**
 * Integration tests against a real, migrated PostgreSQL database.
 *
 * Skipped unless TEST_DATABASE_URL is set. Point it at the *runtime* role of a database that
 * has had `pnpm db:migrate` applied, e.g. `just test-integration` against the dev stack, or
 * the unprivileged application role of a disposable production-like database:
 *
 *   TEST_DATABASE_URL=postgres://app_role:password@127.0.0.1:5432/template_next
 *
 * The tests create rows tagged with a per-run marker and remove what they can. record_changes
 * is append-only by design, so audit rows for the marker rows remain.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { sessionFor } from "../helpers/db";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const mocks = vi.hoisted(() => ({ requireSession: vi.fn() }));
vi.mock("@/lib/dal/require-session", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/lib/cache", () => ({ updateDbCacheTags: vi.fn(), cacheDbRequest: vi.fn() }));
vi.mock("@/utils/stdlog", () => ({
    default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

type Pool = import("pg").Pool;
type AuditRow = {
    operation: string;
    actor_id: string | null;
    changes: Array<[string, unknown, unknown]>;
};

describe.skipIf(!TEST_DATABASE_URL)("PostgreSQL integration (runtime role)", () => {
    const run = randomUUID().slice(0, 8);
    const marker = `it-${run}`;
    const users = { a: `${marker}-a`, b: `${marker}-b`, c: `${marker}-c` };

    let pool: Pool;
    let save: typeof import("../../src/lib/dashboard/common/update_create").save;
    let getRows: typeof import("../../src/lib/dashboard/common/get").getRows;
    let subscribe: typeof import("../../src/lib/dashboard/common/change-events").subscribeToDashboardEvents;
    let checkReadiness: typeof import("../../src/lib/health").checkReadiness;
    let isSuperuser = false;

    const asUser = (id: string) => mocks.requireSession.mockResolvedValue(sessionFor(id));

    async function rowByText(text: string) {
        const { rows } = await pool.query("SELECT * FROM tables WHERE multiline_field = $1", [
            text,
        ]);
        return rows[0];
    }

    async function auditFor(id: number): Promise<AuditRow[]> {
        const { rows } = await pool.query(
            `SELECT operation, actor_id, changes FROM record_changes
             WHERE target = 'tables' AND record_key = jsonb_build_object('id', $1::int)
             ORDER BY id`,
            [id],
        );
        return rows;
    }

    const changedFields = (audit: AuditRow) => audit.changes.map(([field]) => field).sort();

    beforeAll(async () => {
        const url = new URL(TEST_DATABASE_URL!);
        process.env.POSTGRES_USER = decodeURIComponent(url.username);
        process.env.POSTGRES_PASSWORD = decodeURIComponent(url.password);
        process.env.POSTGRES_DB = url.pathname.slice(1);
        process.env.DB_HOST = url.hostname;
        process.env.DB_PORT = url.port || "5432";

        ({ pool } = await import("../../src/db"));
        ({ save } = await import("../../src/lib/dashboard/common/update_create"));
        ({ getRows } = await import("../../src/lib/dashboard/common/get"));
        ({ subscribeToDashboardEvents: subscribe } =
            await import("../../src/lib/dashboard/common/change-events"));
        ({ checkReadiness } = await import("../../src/lib/health"));

        for (const [key, id] of Object.entries(users)) {
            await pool.query(`INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3)`, [
                id,
                `Tester ${key.toUpperCase()} ${run}`,
                `${id}@example.test`,
            ]);
        }

        const { rows } = await pool.query(
            "SELECT rolsuper FROM pg_roles WHERE rolname = current_user",
        );
        isSuperuser = rows[0]?.rolsuper === true;
    });

    afterAll(async () => {
        if (!pool) return;
        await pool.query("DELETE FROM tables WHERE multiline_field LIKE $1", [`${marker}%`]);
        await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [Object.values(users)]);
        await pool.end();
    });

    beforeEach(() => asUser(users.a));

    describe("schema", () => {
        it("is migrated, including the audit trigger", async () => {
            await expect(checkReadiness(pool)).resolves.toEqual({ ok: true });
        });
    });

    describe("save() creates", () => {
        it("persists authorship from the session and writes an insert audit row", async () => {
            await save("tables", {
                multiline_field: `${marker} create`,
                number_field: 3,
                author_id: users.c, // forged; must be ignored
            });

            const row = await rowByText(`${marker} create`);
            expect(row).toMatchObject({
                author_id: users.a,
                last_editor_id: users.a,
                number_field: 3,
            });

            const [audit, ...rest] = await auditFor(row.id);
            expect(rest).toHaveLength(0);
            expect(audit).toMatchObject({ operation: "insert", actor_id: users.a });
            expect(audit!.changes).toContainEqual(["multiline_field", null, `${marker} create`]);
            expect(audit!.changes).toContainEqual(["author_id", null, users.a]);
        });

        it("broadcasts exactly one change event after a successful write", async () => {
            const listener = vi.fn();
            const stop = await subscribe(listener);

            await save("tables", { multiline_field: `${marker} event` });
            stop();

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ event: "dashboard-change", target: "tables" }),
            );
        });

        it("rejects a blank required field at the database and leaves no trace", async () => {
            const listener = vi.fn();
            const stop = await subscribe(listener);
            const before = await pool.query("SELECT count(*)::int AS n FROM tables");
            const auditBefore = await pool.query(
                "SELECT count(*)::int AS n FROM record_changes WHERE target = 'tables'",
            );

            await expect(save("tables", { multiline_field: "   " })).rejects.toThrow();
            stop();

            const after = await pool.query("SELECT count(*)::int AS n FROM tables");
            const auditAfter = await pool.query(
                "SELECT count(*)::int AS n FROM record_changes WHERE target = 'tables'",
            );
            expect(after.rows[0].n).toBe(before.rows[0].n);
            expect(auditAfter.rows[0].n).toBe(auditBefore.rows[0].n);
            expect(listener).not.toHaveBeenCalled();
        });

        it("rejects a non-existent author reference (foreign key)", async () => {
            asUser(`${marker}-missing`);
            await expect(save("tables", { multiline_field: `${marker} fk` })).rejects.toThrow();
            expect(await rowByText(`${marker} fk`)).toBeUndefined();
        });
    });

    describe("save() updates", () => {
        it("records only the fields that changed, attributed to the editing user", async () => {
            await save("tables", { multiline_field: `${marker} update`, text_field: "before" });
            const created = await rowByText(`${marker} update`);

            asUser(users.b);
            await save(
                "tables",
                { id: created.id, text_field: "after", author_id: users.c },
                { isUpdate: true, idColumnName: "id" },
            );

            const row = await rowByText(`${marker} update`);
            expect(row).toMatchObject({
                text_field: "after",
                author_id: users.a,
                last_editor_id: users.b,
            });

            const audits = await auditFor(created.id);
            const update = audits.find((audit) => audit.operation === "update")!;
            expect(update.actor_id).toBe(users.b);
            expect(update.changes).toContainEqual(["text_field", "before", "after"]);
            expect(update.changes).toContainEqual(["last_editor_id", users.a, users.b]);
            expect(changedFields(update)).not.toContain("author_id");
            expect(changedFields(update)).not.toContain("multiline_field");
            expect(changedFields(update)).not.toContain("created_at");
        });

        it("fails for a row that does not exist and does not broadcast", async () => {
            const listener = vi.fn();
            const stop = await subscribe(listener);

            await expect(
                save(
                    "tables",
                    { id: 2_000_000_000, text_field: "x" },
                    { isUpdate: true, idColumnName: "id" },
                ),
            ).rejects.toThrow(/no longer exists/);
            stop();

            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe("database-owned behaviour", () => {
        it("keeps updated_at under database control and ignores no-op updates", async () => {
            const { rows: inserted } = await pool.query(
                `INSERT INTO tables (multiline_field, text_field, updated_at)
                 VALUES ($1, 'same', '2000-01-01T00:00:00Z') RETURNING id`,
                [`${marker} noop`],
            );
            const id = inserted[0].id as number;

            await pool.query("UPDATE tables SET text_field = text_field WHERE id = $1", [id]);
            const untouched = await pool.query("SELECT updated_at FROM tables WHERE id = $1", [id]);
            expect(new Date(untouched.rows[0].updated_at).getUTCFullYear()).toBe(2000);
            expect((await auditFor(id)).map((a) => a.operation)).toEqual(["insert"]);

            // A real change bumps updated_at even if the writer tries to set it.
            await pool.query(
                "UPDATE tables SET text_field = 'changed', updated_at = '2001-01-01T00:00:00Z' WHERE id = $1",
                [id],
            );
            const bumped = await pool.query("SELECT updated_at FROM tables WHERE id = $1", [id]);
            expect(Date.now() - new Date(bumped.rows[0].updated_at).getTime()).toBeLessThan(60_000);
        });

        it("audits writes that bypass the application helpers, including deletes", async () => {
            const { rows } = await pool.query(
                `INSERT INTO tables (multiline_field, last_editor_id) VALUES ($1, $2) RETURNING id`,
                [`${marker} direct`, users.b],
            );
            const id = rows[0].id as number;
            await pool.query("DELETE FROM tables WHERE id = $1", [id]);

            const audits = await auditFor(id);
            expect(audits.map((audit) => audit.operation)).toEqual(["insert", "delete"]);
            expect(audits[0]!.actor_id).toBe(users.b);
            expect(audits[1]!.changes).toContainEqual([
                "multiline_field",
                `${marker} direct`,
                null,
            ]);
        });

        it("enforces the NOT-blank check constraint for direct writes too", async () => {
            await expect(
                pool.query("INSERT INTO tables (multiline_field) VALUES ('   ')"),
            ).rejects.toMatchObject({ code: "23514" });
        });
    });

    describe("audit log integrity", () => {
        async function anAuditId() {
            const { rows } = await pool.query(
                "SELECT id FROM record_changes WHERE target = 'tables' ORDER BY id DESC LIMIT 1",
            );
            return rows[0].id as number;
        }

        it("cannot be rewritten or deleted", async () => {
            const id = await anAuditId();

            await expect(
                pool.query("UPDATE record_changes SET operation = 'delete' WHERE id = $1", [id]),
            ).rejects.toThrow(/append-only/);
            await expect(
                pool.query("UPDATE record_changes SET changes = '[]' WHERE id = $1", [id]),
            ).rejects.toThrow(/append-only/);
            await expect(
                pool.query("DELETE FROM record_changes WHERE id = $1", [id]),
            ).rejects.toThrow(/append-only/);
        });

        it("survives account removal: the actor reference is cleared, nothing else changes", async () => {
            asUser(users.c);
            await save("tables", { multiline_field: `${marker} actor-removal` });
            const row = await rowByText(`${marker} actor-removal`);
            const [before] = await auditFor(row.id);
            expect(before!.actor_id).toBe(users.c);

            await pool.query(`DELETE FROM "user" WHERE id = $1`, [users.c]);

            const [after] = await auditFor(row.id);
            expect(after!.actor_id).toBeNull();
            expect(after!.changes).toEqual(before!.changes);
        });
    });

    describe("least privilege", () => {
        it.skipIf(isSuperuser)("the runtime role cannot change the schema", async () => {
            await expect(
                pool.query("CREATE TABLE should_not_exist (id int)"),
            ).rejects.toMatchObject({
                code: "42501",
            });
            await expect(pool.query("DROP TABLE tables")).rejects.toMatchObject({ code: "42501" });
            await expect(
                pool.query("ALTER TABLE tables ADD COLUMN pwned text"),
            ).rejects.toMatchObject({
                code: "42501",
            });
            await expect(
                pool.query("DROP TRIGGER tables_record_field_changes ON tables"),
            ).rejects.toMatchObject({ code: "42501" });
        });
    });

    describe("getRows()", () => {
        it("returns rows newest-first with author and editor names", async () => {
            await save("tables", { multiline_field: `${marker} read 1` });
            asUser(users.b);
            await save("tables", { multiline_field: `${marker} read 2` });

            const result = await getRows("tables", "id");

            expect(result.ok).toBe(true);
            const rows = (result.ok ? result.data : []) as Array<Record<string, unknown>>;
            const mine = rows.filter((row) =>
                String(row.multiline_field).startsWith(`${marker} read`),
            );
            expect(mine.map((row) => row.multiline_field)).toEqual([
                `${marker} read 2`,
                `${marker} read 1`,
            ]);
            expect(mine[0]).toMatchObject({
                author: `Tester B ${run}`,
                last_editor: `Tester B ${run}`,
            });
            expect(mine[1]).toMatchObject({ author: `Tester A ${run}` });
            expect(rows.every((row) => typeof row.id === "number")).toBe(true);
        });

        it("rejects an unknown id column", async () => {
            await expect(getRows("tables", "nope")).resolves.toEqual({
                ok: false,
                error: "Unknown id column",
            });
        });
    });

    describe("concurrency", () => {
        it("keeps every concurrent write and its audit entry", async () => {
            await Promise.all(
                Array.from({ length: 8 }, (_, i) =>
                    save("tables", { multiline_field: `${marker} parallel ${i}` }),
                ),
            );

            const { rows } = await pool.query(
                "SELECT count(*)::int AS n FROM tables WHERE multiline_field LIKE $1",
                [`${marker} parallel%`],
            );
            expect(rows[0].n).toBe(8);

            const audits = await pool.query(
                `SELECT count(*)::int AS n FROM record_changes
                 WHERE target = 'tables' AND operation = 'insert'
                   AND changes::text LIKE $1`,
                [`%${marker} parallel%`],
            );
            expect(audits.rows[0].n).toBe(8);
        });
    });
});
