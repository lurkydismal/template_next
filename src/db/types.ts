import { notifications, tables, user } from "./schema";

export type TablesRow = typeof tables.$inferSelect;
export type TablesRowInsert = typeof tables.$inferInsert;

export type UserRow = typeof user.$inferSelect;
export type UserRowInsert = typeof user.$inferInsert;
export type UserRowPublic = Omit<UserRow, "id" | "createdAt" | "updatedAt">;

export type NotificationsRow = typeof notifications.$inferSelect;
export type NotificationsRowInsert = typeof notifications.$inferInsert;
