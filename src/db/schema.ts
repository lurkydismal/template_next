import { sql } from "drizzle-orm";
import {
    boolean,
    check,
    index,
    jsonb,
    serial,
    snakeCase,
    text,
    timestamp,
    varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import * as templates from "./templates";

export { user } from "./auth-schema";

const table = snakeCase.table;

export const tables = table("tables", templates.table, (t) => [
    check("multilineField_not_blank", sql`length(trim(${t.multiline_field})) > 0`),

    index().on(t.author_id),
    index().on(t.last_editor_id),
]);

export const notifications = table(
    "notifications",
    {
        id: serial().primaryKey(),
        type: varchar({
            length: 16,
            enum: ["default", "success", "error", "warning", "info"],
        })
            .notNull()
            .default("default"),
        message: text().notNull(),
        is_read: boolean().notNull().default(false),
        read_at: timestamp({ withTimezone: true }),
        created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        check("notification_message_not_blank", sql`length(trim(${t.message})) > 0`),
        index().on(t.is_read),
        index().on(t.created_at),
    ],
);

// * NOTE: Better Auth
export const session = table(
    "session",
    {
        id: text("id").primaryKey(),
        expiresAt: timestamp("expires_at").notNull(),
        token: text("token").notNull().unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
    },
    (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = table(
    "account",
    {
        id: text("id").primaryKey(),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = table(
    "verification",
    {
        id: text("id").primaryKey(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index("verification_identifier_idx").on(table.identifier)],
);

/** JSON-compatible values stored in compact audit change tuples. */
export type AuditJsonValue =
    | string
    | number
    | boolean
    | null
    | AuditJsonValue[]
    | { [key: string]: AuditJsonValue };

/** [physical column name, previous value, next value]. */
export type AuditFieldChange = [field: string, before: AuditJsonValue, after: AuditJsonValue];

export type AuditOperation = "insert" | "update" | "delete";

/**
 * Append-only audit history for editable dashboard rows.
 *
 * `changes` is stored as compact JSONB tuples rather than full row snapshots:
 * [["column_name", oldValue, newValue], ...].
 */
export const recordChanges = table(
    "record_changes",
    {
        id: serial().primaryKey(),
        target: varchar({ length: 64 }).notNull(),
        record_key: jsonb().$type<Record<string, AuditJsonValue>>().notNull(),
        operation: varchar({ length: 6, enum: ["insert", "update", "delete"] })
            .$type<AuditOperation>()
            .notNull(),
        actor_id: text().references(() => user.id, { onDelete: "set null" }),
        changes: jsonb().$type<AuditFieldChange[]>().notNull(),
        created_at: timestamp({ precision: 0, withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        check(
            "record_changes_operation_valid",
            sql`${t.operation} in ('insert', 'update', 'delete')`,
        ),
        check("record_changes_changes_array", sql`jsonb_typeof(${t.changes}) = 'array'`),
        index("record_changes_record_idx").on(t.target, t.record_key, t.created_at),
        index("record_changes_actor_idx").on(t.actor_id),
        index("record_changes_created_at_idx").on(t.created_at),
    ],
);

/*
-- A database trigger captures every INSERT/UPDATE/DELETE against `tables`,
-- including writes that do not pass through the Next.js save() helper.
CREATE OR REPLACE FUNCTION "record_tables_field_changes"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    before_row jsonb;
    after_row jsonb;
    field_changes jsonb;
    row_id integer;
    actor_id_value text;
    operation_name varchar(6);
BEGIN
    IF TG_OP = 'INSERT' THEN
        after_row := to_jsonb(NEW);
        row_id := NEW.id;
        actor_id_value := NEW.last_editor_id;
        operation_name := 'insert';

        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_array(fields.key, 'null'::jsonb, fields.value)
                ORDER BY fields.key
            ),
            '[]'::jsonb
        )
        INTO field_changes
        FROM jsonb_each(after_row) AS fields(key, value);

    ELSIF TG_OP = 'UPDATE' THEN
        before_row := to_jsonb(OLD);
        after_row := to_jsonb(NEW);
        row_id := NEW.id;
        actor_id_value := NEW.last_editor_id;
        operation_name := 'update';

        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_array(old_fields.key, old_fields.value, new_fields.value)
                ORDER BY old_fields.key
            ),
            '[]'::jsonb
        )
        INTO field_changes
        FROM jsonb_each(before_row) AS old_fields(key, value)
        JOIN jsonb_each(after_row) AS new_fields USING (key)
        WHERE old_fields.value IS DISTINCT FROM new_fields.value;

    ELSE
        before_row := to_jsonb(OLD);
        row_id := OLD.id;
        actor_id_value := OLD.last_editor_id;
        operation_name := 'delete';

        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_array(fields.key, fields.value, 'null'::jsonb)
                ORDER BY fields.key
            ),
            '[]'::jsonb
        )
        INTO field_changes
        FROM jsonb_each(before_row) AS fields(key, value);
    END IF;

    -- Ignore no-op UPDATE statements so the history contains real field changes only.
    IF jsonb_array_length(field_changes) > 0 THEN
        INSERT INTO "record_changes" (
            "target", "record_key", "operation", "actor_id", "changes"
        )
        VALUES (
            'tables',
            jsonb_build_object('id', row_id),
            operation_name,
            actor_id_value,
            field_changes
        );
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "tables_record_field_changes" ON "tables";
CREATE TRIGGER "tables_record_field_changes"
AFTER INSERT OR UPDATE OR DELETE ON "tables"
FOR EACH ROW
EXECUTE FUNCTION "record_tables_field_changes"();
*/
