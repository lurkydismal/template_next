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
    updated_at: timestamp().defaultNow().notNull(),
    created_at: timestamp().defaultNow().notNull(),
};
