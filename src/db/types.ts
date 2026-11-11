import { notifications, tables } from "./schema";

export type TablesRow = typeof tables.$inferSelect;
export type TablesRowInsert = typeof tables.$inferInsert;

export type NotificationsRow = typeof notifications.$inferSelect;
