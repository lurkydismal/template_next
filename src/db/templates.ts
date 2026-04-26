import { serial, text, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";

export const template_table = {
    id: serial().primaryKey(),
    content: text().notNull(),
    author: varchar({ length: 32 }).default("system").notNull(),
    last_editor: varchar({ length: 32 }).default("system").notNull(),
    ...timestamps,
};
