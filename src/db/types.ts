import { table, users } from "./schema";

export type TableRow = typeof table.$inferSelect;
export type TableRowInsert = typeof table.$inferInsert;

export type UsersRow = typeof users.$inferSelect;
export type UsersRowInsert = typeof users.$inferInsert;
export type UsersRowPublic = Omit<
    UsersRow,
    "id" | "password_hash" | "created_at" | "updated_at"
>;
