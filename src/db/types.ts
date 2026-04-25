import { categories, table, users } from "./schema";

export type TableRow = typeof table.$inferSelect;
export type TableRowInsert = typeof table.$inferInsert;

export type UsersRow = typeof users.$inferSelect;
export type UsersRowInsert = typeof users.$inferInsert;
export type UsersRowPublic = Omit<
    UsersRow,
    "id" | "password_hash" | "created_at" | "updated_at"
>;

export type CategoriesRow = typeof categories.$inferSelect;
export type CategoriesRowInsert = typeof categories.$inferInsert;
export type CategoriesRowPublic = Omit<
    CategoriesRow,
    "id" | "created_at" | "updated_at"
>;
