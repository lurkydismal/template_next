import {
    serial,
    pgTable,
    text,
} from "drizzle-orm/pg-core";
import { timestamps } from "@/db/helpers";

export const template_table = {
    id: serial().primaryKey(),
    content: text().notNull(),
    ...timestamps,
};

export const table = pgTable("table", template_table);

export type TableRow = typeof table.$inferSelect;
export type TableRowInsert = typeof table.$inferInsert;
