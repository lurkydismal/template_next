import { timestamp } from "drizzle-orm/pg-core";

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
 *     ...timestamps,
 * });
 */
export const timestamps = {
    updated_at: timestamp({ precision: 0, withTimezone: true })
        .defaultNow()
        .notNull(),
    created_at: timestamp({ precision: 0, withTimezone: true })
        .defaultNow()
        .notNull(),
};

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
