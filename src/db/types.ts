import { tables, users } from "./schema";

export type TablesRow = typeof tables.$inferSelect;
export type TablesRowInsert = typeof tables.$inferInsert;

export type UsersRow = typeof users.$inferSelect;
export type UsersRowInsert = typeof users.$inferInsert;
export type UsersRowPublic = Omit<
    UsersRow,
    "id" | "password_hash" | "created_at" | "updated_at"
>;
