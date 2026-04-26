import {
    varchar,
    serial,
    pgTable,
    text,
    check,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { sql } from "drizzle-orm";
import { template_table } from "./templates";

export const table = pgTable("table", template_table, (t) => [
    check("content_not_blank", sql`length(trim(${t.content})) > 0`),
    check("author_not_blank", sql`length(trim(${t.author})) > 0`),
    check(
        "last_editor_not_blank",
        sql`length(trim(${t.last_editor})) > 0`,
    ),

    uniqueIndex().on(t.created_at),
    uniqueIndex().on(t.updated_at),
]);

export const users = pgTable(
    "users",
    {
        id: serial().primaryKey(),
        username: varchar({ length: 32 }).unique().notNull(),
        username_normalized: varchar({ length: 32 }).unique().notNull(),
        password_hash: text().notNull(),
        ...timestamps,
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

export const categories = pgTable(
    "categories",
    {
        id: serial().primaryKey(),
        name: varchar({ length: 50 }).unique().notNull(),
        ...timestamps,
    },
    (t) => [check("name_not_blank", sql`length(trim(${t.name})) > 0`)],
);
