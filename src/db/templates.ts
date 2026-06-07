import { integer, serial, text } from "drizzle-orm/pg-core";
import { metadataColumns } from "./helpers";

export const table = {
    id: serial().primaryKey(),
    textField: text(),
    multilineField: text().notNull(),
    markdownField: text(),
    customField: text(),
    autocompleteField: text(),
    dateField: text(),
    timeField: text(),
    datetimeField: text(),
    numberField: integer(),
    uuidField: text(),
    hexField: text(),
    inetField: text(),
    tableLookupField: text(),
    fileField: text(),
    ...metadataColumns,
};
