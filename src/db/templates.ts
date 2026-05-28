import { serial, text } from "drizzle-orm/pg-core";
import { metadataColumns } from "./helpers";

export const table = {
    id: serial().primaryKey(),
    content: text().notNull(),
    ...metadataColumns,
};
