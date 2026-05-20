import { pgTable, check, serial, varchar, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { template_table } from "./templates";
import { timestampsColumns } from "./helpers";

export const table = pgTable("table", template_table, (t) => [
    check("content_not_blank", sql`length(trim(${t.content})) > 0`),
    check("author_not_blank", sql`length(trim(${t.author})) > 0`),
    check("last_editor_not_blank", sql`length(trim(${t.last_editor})) > 0`),
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
