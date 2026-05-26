import { integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./schema";

/**
 * timestamps
 *
 * A reusable object defining standard timestamp columns for database tables:
 *
 * Fields:
 * - `created_at`: stores the record creation time, defaults to current time, not nullable
 * - `updated_at`: stores the last update time, defaults to current time, not nullable
 *
 * Usage:
 * Can be spread into table definitions in Drizzle ORM to automatically include
 * consistent created/updated timestamps for all tables.
 *
 * Example:
 * const users = pgTable("users", {
 *     id: serial("id").primaryKey(),
 *     name: text("name").notNull(),
 *     ...timestampsColumns,
 * });
 */
export const timestampsColumns = {
    updated_at: timestamp({ precision: 0, withTimezone: true })
        .defaultNow()
        .notNull(),
    created_at: timestamp({ precision: 0, withTimezone: true })
        .defaultNow()
        .notNull(),
};

// * NOTE: PSQL function to automatically update updated_at on any row change
/*
-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Register triggers
CREATE TRIGGER update_table_updated_at
BEFORE UPDATE ON "table"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
*/

/**
 * Common authorship metadata columns for mutable records.
 *
 * const posts = pgTable("posts", {
 *   id: serial("id").primaryKey(),
 *   title: text("title").notNull(),
 *   ...auditColumns,
 * });
 */
export const auditColumns = {
    author_id: integer().references(() => users.id, { onDelete: "set null" }),
    last_editor_id: integer().references(() => users.id, {
        onDelete: "set null",
    }),
};

/**
 * Full metadata bundle combining author/edit columns with timestamps.
 *
 * @example
 * const auditTable = pgTable("audit", {
 *   id: serial("id").primaryKey(),
 *   ...metadataColumns,
 * });
 */
export const metadataColumns = {
    ...auditColumns,
    ...timestampsColumns,
};
