import { serial, pgTable, text, uniqueIndex, check } from "drizzle-orm/pg-core";
import { timestamps } from "@/db/helpers";
import { sql } from "drizzle-orm";

export const template_table = {
    id: serial().primaryKey(),
    content: text().notNull(),
    ...timestamps,
};

export const table = pgTable("table", template_table, (t) => [
    check(
        "content_not_blank",
        sql`length(trim(${t.content})) > 0`
    ),

    uniqueIndex().on(t.created_at),
    uniqueIndex().on(t.updated_at),
]);

export type TableRow = typeof table.$inferSelect;
export type TableRowInsert = typeof table.$inferInsert;
