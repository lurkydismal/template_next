import {
    pgTable,
    check,
    serial,
    varchar,
    text,
    index,
    boolean,
    timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import * as templates from "./templates";
import { timestampsColumns } from "./helpers";

export const tables = pgTable("tables", templates.table, (t) => [
    check(
        "multilineField_not_blank",
        sql`length(trim(${t.multiline_field})) > 0`,
    ),

    index().on(t.author_id),
    index().on(t.last_editor_id),
]);

export const users = pgTable(
    "users",
    {
        id: serial().primaryKey(),
        username: varchar({ length: 32 }).unique().notNull(),
        username_normalized: varchar({ length: 32 }).unique().notNull(),
        password_hash: text().notNull(),
        ...timestampsColumns,
    },
    (t) => [
        check("username_not_blank", sql`length(trim(${t.username})) > 0`),
        check(
            "username_normalized_not_blank",
            sql`length(trim(${t.username_normalized})) > 0`,
        ),
        check(
            "username_normalized_lowercase",
            sql`${t.username_normalized} = lower(${t.username_normalized})`,
        ),
    ],
);

export const notifications = pgTable(
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
        check(
            "notification_message_not_blank",
            sql`length(trim(${t.message})) > 0`,
        ),
        index().on(t.is_read),
        index().on(t.created_at),
    ],
);
