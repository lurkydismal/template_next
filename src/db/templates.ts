import {
    serial,
    text,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";

export const template_table = {
    id: serial().primaryKey(),
    content: text().notNull(),
    ...timestamps,
};